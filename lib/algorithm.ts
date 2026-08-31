import 'server-only'

import {
  detectAttribution,
  isSourceConfidence,
  isSourceEvidence,
  type SourceConfidence,
  type SourceEvidence,
} from '@/lib/attribution'

export {
  FIRST_TOUCH_COOKIE_NAME,
  SESSION_SOURCE_COOKIE_NAME,
  SOURCE_CONFIDENCE_COOKIE_NAME,
  SOURCE_DETAIL_COOKIE_NAME,
  SOURCE_EVIDENCE_COOKIE_NAME,
  SOURCE_REFERRER_COOKIE_NAME,
  classifySource,
} from '@/lib/attribution'

export const VISITOR_COOKIE_NAME = 'prop_visitor_id'
export const SESSION_COOKIE_NAME = 'prop_session_id'
export const LAST_PRODUCT_COOKIE_NAME = 'prop_last_product_id'
export const ALGORITHM_EVENT_TYPE = 'product_view'

const BOT_USER_AGENT = /bot|crawler|spider|slurp|headless|prerender|facebookexternalhit|whatsapp/i

const isIP = (ip: string): number => {
  const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6 = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i

  if (ipv4.test(ip)) return 4
  if (ipv6.test(ip)) return 6
  return 0
}

const rotl32 = (value: number, shift: number): number => ((value << shift) | (value >>> (32 - shift))) >>> 0

async function hashHex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hmacHashHex(secret: string, value: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

type LocationData = {
  countryCode: string | null
  country: string | null
  region: string | null
  city: string | null
  isp: string | null
  asn: string | null
}

export type AttributionData = {
  sourcePlatform: string
  firstTouchSource: string
  sessionSource: string
  referrerHost: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  sourceEvidence: SourceEvidence
  sourceConfidence: SourceConfidence
  sourceDetail: string | null
}

const locationCache = new Map<string, { expiresAt: number; data: LocationData }>()

function firstHeaderValue(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null
}

export function getTrustedClientIp(headers: Headers): string | null {
  const candidates = []

  // In production only consume headers that identify a known edge provider.
  // A generic forwarded header can be supplied by a direct client request.
  if (headers.get('cf-ray')) {
    candidates.push(headers.get('cf-connecting-ip'))
  }
  if (headers.get('x-vercel-id') || headers.get('x-vercel-ip-country')) {
    candidates.push(firstHeaderValue(headers.get('x-forwarded-for')))
    candidates.push(headers.get('x-real-ip'))
  }
  if (process.env.NODE_ENV !== 'production') {
    candidates.push(headers.get('x-real-ip'))
    candidates.push(firstHeaderValue(headers.get('x-forwarded-for')))
  }

  return candidates.find((candidate) => candidate && isIP(candidate) > 0) || null
}

export async function hashClientIp(ip: string | null): Promise<string | null> {
  const secret = process.env.ALGORITHM_IP_HMAC_SECRET
  if (!ip) return null

  if (secret) {
    return hmacHashHex(secret, ip)
  }

  // Optional-env fallback: stable across deploys, but not secret. Configure
  // ALGORITHM_IP_HMAC_SECRET when IP correlation must resist guessing attacks.
  return hashHex(`prop-ip-v1:${ip}`)
}

function ipv4ToNumber(ip: string): number | null {
  if (isIP(ip) !== 4) return null
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null
  }

  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

function matchesIpv4Cidr(ip: string, cidr: string): boolean {
  const [network, prefixText] = cidr.trim().split('/')
  const ipNumber = ipv4ToNumber(ip)
  const networkNumber = ipv4ToNumber(network)
  const prefix = Number(prefixText ?? '32')

  if (ipNumber === null || networkNumber === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (ipNumber & mask) === (networkNumber & mask)
}

function isLocalOrPrivateIp(ip: string): boolean {
  return ip === '127.0.0.1'
    || ip === '::1'
    || ip.startsWith('10.')
    || ip.startsWith('192.168.')
    || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
    || ip.startsWith('fc')
    || ip.startsWith('fd')
}

export function isInternalIp(ip: string | null): boolean {
  if (!ip) return false

  const configuredCidrs = (process.env.ALGORITHM_INTERNAL_CIDRS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return configuredCidrs.some((cidr) => cidr === ip || matchesIpv4Cidr(ip, cidr))
}

export function classifyTraffic(userAgent: string | null, internal: boolean) {
  const isBot = Boolean(userAgent && BOT_USER_AGENT.test(userAgent))
  const trafficType = isBot ? 'bot' : internal ? 'internal' : 'unknown'

  return {
    isBot,
    trafficType,
    isCountable: !isBot && !internal,
  } as const
}

function cleanAttributionValue(value: string | null, maxLength = 200): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export function getClientProfile(userAgent: string | null) {
  const ua = userAgent || ''
  const deviceType = /ipad|tablet|android(?!.*mobile)/i.test(ua)
    ? 'tablet'
    : /mobile|iphone|ipod|android/i.test(ua)
      ? 'mobile'
      : 'desktop'
  const osName = /windows/i.test(ua)
    ? 'Windows'
    : /android/i.test(ua)
      ? 'Android'
      : /iphone|ipad|ipod/i.test(ua)
        ? 'iOS'
        : /mac os|macintosh/i.test(ua)
          ? 'macOS'
          : /linux/i.test(ua)
            ? 'Linux'
            : 'Other'
  const browserName = /edg\//i.test(ua)
    ? 'Edge'
    : /chrome\//i.test(ua)
      ? 'Chrome'
      : /firefox\//i.test(ua)
        ? 'Firefox'
        : /safari\//i.test(ua) && !/chrome\//i.test(ua)
          ? 'Safari'
          : /opr\//i.test(ua)
            ? 'Opera'
            : 'Other'
  return { deviceType, osName, browserName }
}

export function getAttributionData(
  requestUrl: string,
  referrer: string | null,
  firstTouchCookie: string | null,
  sessionSourceCookie: string | null,
  evidenceCookie: string | null = null,
  confidenceCookie: string | null = null,
  detailCookie: string | null = null,
  referrerHostCookie: string | null = null,
): AttributionData {
  const url = new URL(requestUrl)
  const params = url.searchParams
  const utmSource = cleanAttributionValue(params.get('utm_source'))
  const utmMedium = cleanAttributionValue(params.get('utm_medium'))
  const utmCampaign = cleanAttributionValue(params.get('utm_campaign'))
  const utmContent = cleanAttributionValue(params.get('utm_content'))
  const utmTerm = cleanAttributionValue(params.get('utm_term'))
  const detected = detectAttribution(requestUrl, referrer)
  const hasExplicitCurrentSource = detected.evidence !== 'direct'
  const sourcePlatform = hasExplicitCurrentSource ? detected.sourcePlatform : sessionSourceCookie || detected.sourcePlatform
  const sourceEvidence = hasExplicitCurrentSource
    ? detected.evidence
    : isSourceEvidence(evidenceCookie) ? evidenceCookie : detected.evidence
  const sourceConfidence = hasExplicitCurrentSource
    ? detected.confidence
    : isSourceConfidence(confidenceCookie) ? confidenceCookie : detected.confidence
  const sourceDetail = hasExplicitCurrentSource ? detected.detail : detailCookie || detected.detail
  const referrerHost = hasExplicitCurrentSource ? detected.referrerHost : referrerHostCookie || detected.referrerHost
  return {
    sourcePlatform,
    firstTouchSource: firstTouchCookie || sourcePlatform,
    sessionSource: sourcePlatform,
    referrerHost,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    sourceEvidence,
    sourceConfidence,
    sourceDetail,
  }
}

export function getLocationHeaders(headers: Headers) {
  const trustedEdge = process.env.NODE_ENV !== 'production'
    || Boolean(headers.get('cf-ray') || headers.get('x-vercel-id'))
  if (!trustedEdge) {
    return {
      country: null,
      countryCode: null,
      region: null,
      city: null,
      isp: null,
      asn: null,
    }
  }
  const country = headers.get('cf-ipcountry') || headers.get('x-vercel-ip-country')
  return {
    country,
    countryCode: country,
    region: headers.get('cf-region') || headers.get('cf-region-code') || headers.get('x-vercel-ip-country-region'),
    city: headers.get('cf-ipcity') || headers.get('x-vercel-ip-city'),
    isp: headers.get('cf-isp') || headers.get('x-vercel-ip-isp'),
    asn: headers.get('cf-asn') || headers.get('x-vercel-ip-asn'),
  }
}

function normalizeCountryCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase() || ''
  return /^[A-Z]{2}$/.test(normalized) && normalized !== 'XX' ? normalized : null
}

function decodeLocationValue(value: string | null): string | null {
  if (!value) return null
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value
  }
}

export async function getLocationData(headers: Headers, ip: string | null): Promise<LocationData> {
  const edgeHeaders = getLocationHeaders(headers)
  const headerLocation: LocationData = {
    countryCode: normalizeCountryCode(edgeHeaders.countryCode),
    country: decodeLocationValue(edgeHeaders.country),
    region: decodeLocationValue(edgeHeaders.region),
    city: decodeLocationValue(edgeHeaders.city),
    isp: decodeLocationValue(edgeHeaders.isp),
    asn: decodeLocationValue(edgeHeaders.asn),
  }

  if (!ip || Object.values(headerLocation).every(Boolean)) return headerLocation

  const cacheKey = (await hashClientIp(ip)) || ip
  const cached = locationCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return {
      countryCode: headerLocation.countryCode || cached.data.countryCode,
      country: headerLocation.country || cached.data.country,
      region: headerLocation.region || cached.data.region,
      city: headerLocation.city || cached.data.city,
      isp: headerLocation.isp || cached.data.isp,
      asn: headerLocation.asn || cached.data.asn,
    }
  }

  // If the edge supplied at least one location field, only fill the missing
  // fields from the lookup service. This keeps the trusted edge value primary.
  const canLookupPublicIp = ip && !isLocalOrPrivateIp(ip)
  const lookupUrl = canLookupPublicIp
    ? `https://ipwho.is/${encodeURIComponent(ip)}`
    : process.env.NODE_ENV !== 'production'
      ? 'https://ipwho.is/'
      : null

  if (lookupUrl) {
    try {
      const response = await fetch(lookupUrl, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(1500),
        cache: 'no-store',
      })
      if (response.ok) {
        const result = await response.json() as {
          success?: boolean
          country_code?: string
          country?: string
          region?: string
          city?: string
          connection?: { isp?: string; asn?: string | number }
        }

        const data: LocationData = {
          countryCode: result.success === false ? null : normalizeCountryCode(result.country_code),
          country: result.success === false ? null : result.country || null,
          region: result.success === false ? null : result.region || null,
          city: result.success === false ? null : result.city || null,
          isp: result.success === false ? null : result.connection?.isp || null,
          asn: result.success === false ? null : result.connection?.asn ? String(result.connection.asn) : null,
        }
        locationCache.set(cacheKey, { expiresAt: Date.now() + 86_400_000, data })
        return {
          countryCode: headerLocation.countryCode || data.countryCode,
          country: headerLocation.country || data.country,
          region: headerLocation.region || data.region,
          city: headerLocation.city || data.city,
          isp: headerLocation.isp || data.isp,
          asn: headerLocation.asn || data.asn,
        }
      }
    } catch {
      // Analytics must remain best-effort if the lookup service is unavailable.
    }
  }

  return headerLocation
}

export function getViewBucket(date = new Date()): number {
  return Math.floor(date.getTime() / 86_400_000)
}

export function getRecencyWeight(createdAt: string, now = Date.now()): number {
  const ageDays = Math.max(0, (now - new Date(createdAt).getTime()) / 86_400_000)
  return Math.pow(0.5, ageDays / 7)
}

export function getTrafficQualityWeight(trafficType: string, isCountable: boolean): number {
  if (!isCountable || trafficType === 'bot' || trafficType === 'internal') return 0
  return 1
}

export function getAvailabilityFactor(availability: 'available' | 'preorder'): number {
  return availability === 'available' ? 1 : 0.6
}
