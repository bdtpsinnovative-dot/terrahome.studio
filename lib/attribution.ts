export const FIRST_TOUCH_COOKIE_NAME = 'prop_first_touch'
export const SESSION_SOURCE_COOKIE_NAME = 'prop_session_source'
export const SOURCE_EVIDENCE_COOKIE_NAME = 'prop_source_evidence'
export const SOURCE_CONFIDENCE_COOKIE_NAME = 'prop_source_confidence'
export const SOURCE_DETAIL_COOKIE_NAME = 'prop_source_detail'
export const SOURCE_REFERRER_COOKIE_NAME = 'prop_source_referrer'

export type SourceConfidence = 'high' | 'medium' | 'low'
export type SourceEvidence = 'utm' | 'click_id' | 'referrer' | 'direct'

export type DetectedAttribution = {
  sourcePlatform: string
  evidence: SourceEvidence
  confidence: SourceConfidence
  detail: string | null
  referrerHost: string | null
}

const SOURCE_HOSTS: Array<{ source: string; hosts: RegExp[] }> = [
  { source: 'Instagram', hosts: [/(^|\.)instagram\.com$/, /(^|\.)instagram\.app\.link$/] },
  { source: 'Facebook', hosts: [/(^|\.)facebook\.com$/, /(^|\.)fb\.com$/, /(^|\.)fb\.me$/] },
  { source: 'LINE', hosts: [/(^|\.)line\.me$/, /(^|\.)line-apps\.com$/, /(^|\.)line-scdn\.net$/] },
  { source: 'TikTok', hosts: [/(^|\.)tiktok\.com$/] },
  { source: 'YouTube', hosts: [/(^|\.)youtube\.com$/, /(^|\.)youtu\.be$/] },
  { source: 'Pinterest', hosts: [/(^|\.)pinterest\.[a-z.]+$/, /(^|\.)pin\.it$/] },
  { source: 'Google', hosts: [/(^|\.)google\.[a-z.]+$/] },
  { source: 'X', hosts: [/(^|\.)twitter\.com$/, /(^|\.)t\.co$/, /(^|\.)x\.com$/] },
]

const CLICK_IDS: Array<{ params: string[]; source: string; detail: string }> = [
  { params: ['ttclid'], source: 'TikTok', detail: 'TikTok Click ID' },
  { params: ['fbclid'], source: 'Meta Ads', detail: 'Meta Click ID' },
  { params: ['gclid', 'gbraid', 'wbraid'], source: 'Google', detail: 'Google Click ID' },
  { params: ['msclkid'], source: 'Microsoft Ads', detail: 'Microsoft Click ID' },
]

function clean(value: string | null, maxLength = 200) {
  return value?.trim().slice(0, maxLength) || null
}

function hostname(value: string | null) {
  if (!value) return null
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '').slice(0, 200) || null
  } catch {
    return value.toLowerCase().replace(/^www\./, '').split('/')[0]?.slice(0, 200) || null
  }
}

export function classifySource(value: string | null): string {
  const source = (value || '').trim().toLowerCase()
  if (!source) return 'Direct'
  if (/instagram|\big\b/.test(source)) return 'Instagram'
  if (/facebook|\bfb\b|meta/.test(source)) return 'Facebook'
  if (/\bline\b|liff/.test(source)) return 'LINE'
  if (/tiktok/.test(source)) return 'TikTok'
  if (/youtube|youtu\.be/.test(source)) return 'YouTube'
  if (/pinterest|pin\.it/.test(source)) return 'Pinterest'
  if (/google/.test(source)) return 'Google'
  if (/twitter|\bx\b|t\.co/.test(source)) return 'X'
  return 'Referral'
}

function sourceFromHost(referrerHost: string | null) {
  if (!referrerHost) return null
  return SOURCE_HOSTS.find(({ hosts }) => hosts.some((pattern) => pattern.test(referrerHost)))?.source || null
}

export function detectAttribution(requestUrl: string, referrer: string | null): DetectedAttribution {
  const url = new URL(requestUrl)
  const utmSource = clean(url.searchParams.get('utm_source'))
  const referrerHost = hostname(referrer)
  const ownHost = url.hostname.toLowerCase().replace(/^www\./, '')
  const externalReferrerHost = referrerHost && referrerHost !== ownHost ? referrerHost : null

  if (utmSource) {
    const classified = classifySource(utmSource)
    return {
      sourcePlatform: classified === 'Referral' ? utmSource : classified,
      evidence: 'utm',
      confidence: 'high',
      detail: `utm_source=${utmSource}`,
      referrerHost: externalReferrerHost,
    }
  }

  const hostSource = sourceFromHost(externalReferrerHost)
  for (const clickId of CLICK_IDS) {
    if (!clickId.params.some((param) => url.searchParams.has(param))) continue
    const sourcePlatform = clickId.source === 'Meta Ads' && (hostSource === 'Instagram' || hostSource === 'Facebook')
      ? hostSource
      : clickId.source
    return {
      sourcePlatform,
      evidence: 'click_id',
      confidence: 'high',
      detail: clickId.detail,
      referrerHost: externalReferrerHost,
    }
  }

  if (externalReferrerHost) {
    return {
      sourcePlatform: hostSource || 'Referral',
      evidence: 'referrer',
      confidence: hostSource ? 'medium' : 'medium',
      detail: externalReferrerHost,
      referrerHost: externalReferrerHost,
    }
  }

  return {
    sourcePlatform: 'Direct',
    evidence: 'direct',
    confidence: 'low',
    detail: null,
    referrerHost: null,
  }
}

export function isSourceConfidence(value: string | null): value is SourceConfidence {
  return value === 'high' || value === 'medium' || value === 'low'
}

export function isSourceEvidence(value: string | null): value is SourceEvidence {
  return value === 'utm' || value === 'click_id' || value === 'referrer' || value === 'direct'
}
