import 'server-only'

import { createHash, createHmac } from 'node:crypto'
import { isIP } from 'node:net'

export const VISITOR_COOKIE_NAME = 'prop_visitor_id'
export const SESSION_COOKIE_NAME = 'prop_session_id'
export const LAST_PRODUCT_COOKIE_NAME = 'prop_last_product_id'
export const ALGORITHM_EVENT_TYPE = 'product_view'

const BOT_USER_AGENT = /bot|crawler|spider|slurp|headless|prerender|facebookexternalhit|whatsapp/i

type LocationData = {
  countryCode: string | null
  country: string | null
  region: string | null
  city: string | null
  isp: string | null
  asn: string | null
}

const locationCache = new Map<string, { expiresAt: number; data: LocationData }>()

function firstHeaderValue(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null
}

export function getTrustedClientIp(headers: Headers): string | null {
  const candidates = [
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    firstHeaderValue(headers.get('x-forwarded-for')),
  ]

  return candidates.find((candidate) => candidate && isIP(candidate) > 0) || null
}

export function hashClientIp(ip: string | null): string | null {
  const secret = process.env.ALGORITHM_IP_HMAC_SECRET
  if (!ip) return null

  if (secret) {
    return createHmac('sha256', secret).update(ip).digest('hex')
  }

  // Optional-env fallback: stable across deploys, but not secret. Configure
  // ALGORITHM_IP_HMAC_SECRET when IP correlation must resist guessing attacks.
  return createHash('sha256').update(`prop-ip-v1:${ip}`).digest('hex')
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

export function getLocationHeaders(headers: Headers) {
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

  const cacheKey = hashClientIp(ip) || ip
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
