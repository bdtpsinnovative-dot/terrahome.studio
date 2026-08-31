import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/src/supabase/server'

export const runtime = 'edge'

import {
  FIRST_TOUCH_COOKIE_NAME,
  LAST_PRODUCT_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_SOURCE_COOKIE_NAME,
  SOURCE_CONFIDENCE_COOKIE_NAME,
  SOURCE_DETAIL_COOKIE_NAME,
  SOURCE_EVIDENCE_COOKIE_NAME,
  SOURCE_REFERRER_COOKIE_NAME,
  VISITOR_COOKIE_NAME,
  classifyTraffic,
  getAttributionData,
  getClientProfile,
  getLocationData,
  getTrustedClientIp,
  getViewBucket,
  hashClientIp,
  isInternalIp,
} from '@/lib/algorithm'

export const dynamic = 'force-dynamic'

const EVENT_TYPES = new Set([
  'product_view', 'page_view', 'cta', 'journey',
  'session_start', 'session_heartbeat', 'session_end',
])

type AnalyticsPayload = {
  event_type?: string
  product_id?: number
  collection_group_id?: string
  page_type?: string
  page_path?: string
  page_entity_id?: string
  page_instance_id?: string
  activity_interval_id?: string
  event_name?: string
  active_seconds?: number
  duration_seconds?: number
  tracking_url?: string
  previous_page_type?: string
  previous_page_path?: string
  previous_product_id?: number
  next_page_type?: string
  next_product_id?: number
  journey_outcome?: string
  exit_type?: string
  is_bounce?: boolean
  is_quick_bounce?: boolean
  metadata?: Record<string, unknown>
}

type ProductSnapshotRow = {
  id: number
  name: string | null
  sku: string | null
  price: number | string | null
  specs: Record<string, unknown> | null
  color?: unknown
  colour?: unknown
  colors?: unknown
  colours?: unknown
}

type ProductRelation = {
  id: string | number
  product_sup: string | null
  products?: ProductSnapshotRow | ProductSnapshotRow[]
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)
}

function safeText(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null
}

function validMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).slice(0, 20))
}

function getProductSnapshot(relation: ProductRelation, productId: number | null) {
  if (!productId) return {}
  const products = Array.isArray(relation?.products) ? relation.products : [relation?.products]
  const product = products.find((item) => Number(item?.id) === productId)
  const specs = product?.specs && typeof product.specs === 'object' ? product.specs : {}
  const color = product?.color ?? product?.colour ?? product?.colors ?? product?.colours
    ?? specs.color ?? specs.colour ?? specs.colors ?? specs.colours ?? specs.tone ?? null
  const material = specs.material ?? specs.materials ?? null
  return {
    collection_group_id: String(relation.id),
    product_category_snapshot: relation?.product_sup || null,
    product_name_snapshot: product?.name || null,
    product_sku_snapshot: product?.sku || null,
    product_color_snapshot: color ? String(color).slice(0, 200) : null,
    product_material_snapshot: material ? String(material).slice(0, 200) : null,
    product_price_snapshot: product?.price === null || product?.price === undefined ? null : Number(product.price),
  }
}

function isValidPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && value.length <= 1000
}

export async function POST(request: Request) {
  let payload: AnalyticsPayload
  try {
    payload = await request.json() as AnalyticsPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const eventType = payload.event_type || 'page_view'
  if (!EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: 'Invalid analytics event type' }, { status: 400 })
  }

  if (payload.product_id !== undefined && !Number.isSafeInteger(payload.product_id)) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 })
  }
  if (eventType !== 'session_start' && eventType !== 'session_heartbeat' && eventType !== 'session_end' && !isValidPath(payload.page_path)) {
    return NextResponse.json({ error: 'Page path is required' }, { status: 400 })
  }
  if (payload.page_instance_id !== undefined && !isUuid(payload.page_instance_id)) {
    return NextResponse.json({ error: 'Invalid page instance id' }, { status: 400 })
  }
  if (payload.activity_interval_id !== undefined && !isUuid(payload.activity_interval_id)) {
    return NextResponse.json({ error: 'Invalid activity interval id' }, { status: 400 })
  }

  const supabase = await createClient()
  let relation: ProductRelation | null = null
  if (Number.isSafeInteger(payload.product_id)) {
    let relationQuery = supabase
      .from('collection_groups')
      .select('id, tag, product_sup, products!inner(id, category_id, name, sku, price, color, specs, collection_group_id)')
      .eq('products.id', payload.product_id)
      .eq('products.category_id', 'prop')
      .ilike('tag', '%prop%')
    if (payload.collection_group_id) relationQuery = relationQuery.eq('id', payload.collection_group_id)
    const { data, error } = await relationQuery.maybeSingle()

    if (error || !data) {
      if (error && process.env.NODE_ENV !== 'production') {
        console.error('[algorithm-events] relation query error:', error)
      }
      return NextResponse.json({ error: 'Product is not a Prop product' }, { status: 404 })
    }
    relation = data as unknown as ProductRelation
  }

  const cookieStore = await cookies()
  let visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value
  if (!isUuid(visitorId)) visitorId = randomUUID()

  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const hadSessionCookie = isUuid(sessionCookie)
  const sessionId = hadSessionCookie ? sessionCookie! : randomUUID()

  const previousProductId = Number(cookieStore.get(LAST_PRODUCT_COOKIE_NAME)?.value)
  const userData = await supabase.auth.getUser()
  const userId = userData.data.user?.id || null
  const identityType = userId ? 'user' : 'visitor'
  const identityKey = userId ? `user:${userId}` : `visitor:${visitorId}`
  const clientIp = getTrustedClientIp(request.headers)
  const internal = isInternalIp(clientIp)
  const userAgent = request.headers.get('user-agent')
  const traffic = classifyTraffic(userAgent, internal)
  const location = await getLocationData(request.headers, clientIp)
  const clientProfile = getClientProfile(userAgent)
  const referrer = request.headers.get('referer')
  const trackingUrl = safeText(payload.tracking_url, 4000) || request.url
  const attribution = getAttributionData(
    trackingUrl,
    referrer,
    cookieStore.get(FIRST_TOUCH_COOKIE_NAME)?.value || null,
    cookieStore.get(SESSION_SOURCE_COOKIE_NAME)?.value || null,
    cookieStore.get(SOURCE_EVIDENCE_COOKIE_NAME)?.value || null,
    cookieStore.get(SOURCE_CONFIDENCE_COOKIE_NAME)?.value || null,
    cookieStore.get(SOURCE_DETAIL_COOKIE_NAME)?.value || null,
    cookieStore.get(SOURCE_REFERRER_COOKIE_NAME)?.value || null,
  )
  const productSnapshot = relation ? getProductSnapshot(relation, Number.isSafeInteger(payload.product_id) ? payload.product_id! : null) : {}

  const eventData = {
    event_type: eventType,
    product_id: Number.isSafeInteger(payload.product_id) ? payload.product_id : null,
    collection_group_id: relation ? String(relation.id) : safeText(payload.collection_group_id, 200),
    session_id: sessionId,
    previous_product_id: Number.isSafeInteger(previousProductId) ? previousProductId : null,
    identity_type: identityType,
    identity_key: identityKey,
    user_id: userId,
    visitor_id: userId ? null : visitorId,
    page_type: safeText(payload.page_type, 100),
    page_path: safeText(payload.page_path, 1000),
    page_entity_id: safeText(payload.page_entity_id, 200),
    page_instance_id: isUuid(payload.page_instance_id) ? payload.page_instance_id : null,
    activity_interval_id: isUuid(payload.activity_interval_id) ? payload.activity_interval_id : null,
    event_name: safeText(payload.event_name, 100),
    active_seconds: Math.min(86400, Math.max(0, Number(payload.active_seconds) || 0)),
    duration_seconds: Math.min(86400, Math.max(0, Number(payload.duration_seconds) || 0)),
    next_page_type: safeText(payload.next_page_type, 100),
    next_product_id: Number.isSafeInteger(payload.next_product_id) ? payload.next_product_id : null,
    journey_outcome: safeText(payload.journey_outcome, 100),
    exit_type: safeText(payload.exit_type, 100),
    is_bounce: Boolean(payload.is_bounce),
    is_quick_bounce: Boolean(payload.is_quick_bounce),
    ip_hash: hashClientIp(clientIp),
    country_code: location.countryCode,
    country: location.country,
    region: location.region,
    city: location.city,
    isp: location.isp,
    asn: location.asn,
    user_agent: userAgent?.slice(0, 1000) || null,
    referrer: attribution.referrerHost,
    traffic_type: traffic.trafficType,
    is_bot: traffic.isBot,
    is_internal: internal,
    is_countable: traffic.isCountable,
    source_platform: attribution.sourcePlatform,
    first_touch_source: attribution.firstTouchSource,
    session_source: attribution.sessionSource,
    utm_source: attribution.utmSource,
    utm_medium: attribution.utmMedium,
    utm_campaign: attribution.utmCampaign,
    utm_content: attribution.utmContent,
    utm_term: attribution.utmTerm,
    referrer_host: attribution.referrerHost,
    device_type: clientProfile.deviceType,
    os_name: clientProfile.osName,
    browser_name: clientProfile.browserName,
      metadata: validMetadata({
      ...(payload.metadata || {}),
      ...(userId ? { linked_visitor_id: visitorId } : {}),
      source_evidence: attribution.sourceEvidence,
      source_confidence: attribution.sourceConfidence,
      source_detail: attribution.sourceDetail,
    }),
    ...productSnapshot,
  }

  const { data: eventId, error: rpcError } = await supabase.rpc('record_prop_analytics_event', { p_event: eventData })

  // Keep already deployed storefronts compatible while the additive migration
  // is being rolled out. Existing product_view events still use the old shape.
  if (rpcError && eventType === 'product_view' && relation) {
    const { error: fallbackError } = await supabase.from('algorithm_events').insert({
      event_type: 'product_view', source_tag: 'prop', product_id: payload.product_id,
      collection_group_id: String(relation.id), user_id: userId, visitor_id: userId ? null : visitorId,
      identity_type: identityType, view_bucket: getViewBucket(), ip_hash: hashClientIp(clientIp),
      country_code: location.countryCode, country: location.country, region: location.region, city: location.city,
      isp: location.isp, asn: location.asn, user_agent: userAgent?.slice(0, 1000) || null,
      referrer: attribution.referrerHost, traffic_type: traffic.trafficType, is_bot: traffic.isBot,
      is_internal: internal, is_countable: traffic.isCountable, metadata: validMetadata({
        ...(payload.metadata || {}),
        source_evidence: attribution.sourceEvidence,
        source_confidence: attribution.sourceConfidence,
        source_detail: attribution.sourceDetail,
      }),
      session_id: sessionId, previous_product_id: Number.isSafeInteger(previousProductId) ? previousProductId : null,
      ...getProductSnapshot(relation, Number.isSafeInteger(payload.product_id) ? payload.product_id! : null),
    })
    if (fallbackError) {
      console.error('[algorithm-events] insert failed', { code: fallbackError.code, message: fallbackError.message })
      return NextResponse.json({ error: 'Unable to record analytics event' }, { status: 500 })
    }
  } else if (rpcError) {
    console.error('[algorithm-events] analytics RPC failed', { code: rpcError.code, message: rpcError.message })
    return NextResponse.json({ error: 'Unable to record analytics event' }, { status: 500 })
  }

  const response = NextResponse.json({
    ok: true,
    event_id: eventId || null,
    attribution: {
      source: attribution.sourcePlatform,
      evidence: attribution.sourceEvidence,
      confidence: attribution.sourceConfidence,
      detail: attribution.sourceDetail,
    },
  }, { status: 202 })
  if (!userId) {
    response.cookies.set(VISITOR_COOKIE_NAME, visitorId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 365, path: '/' })
  }
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 30, path: '/' })
  if (eventType === 'product_view' && Number.isSafeInteger(payload.product_id)) {
    response.cookies.set(LAST_PRODUCT_COOKIE_NAME, String(payload.product_id), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 30, path: '/' })
  }
  if (!cookieStore.get(FIRST_TOUCH_COOKIE_NAME)?.value) {
    response.cookies.set(FIRST_TOUCH_COOKIE_NAME, attribution.firstTouchSource, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 365, path: '/' })
  }
  response.cookies.set(SESSION_SOURCE_COOKIE_NAME, attribution.sessionSource, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 30, path: '/' })
  response.cookies.set(SOURCE_EVIDENCE_COOKIE_NAME, attribution.sourceEvidence, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 30, path: '/' })
  response.cookies.set(SOURCE_CONFIDENCE_COOKIE_NAME, attribution.sourceConfidence, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 30, path: '/' })
  if (attribution.sourceDetail) {
    response.cookies.set(SOURCE_DETAIL_COOKIE_NAME, attribution.sourceDetail, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 30, path: '/' })
  }
  if (attribution.referrerHost) {
    response.cookies.set(SOURCE_REFERRER_COOKIE_NAME, attribution.referrerHost, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 30, path: '/' })
  }
  if (!hadSessionCookie && eventType !== 'session_start') {
    response.headers.set('x-prop-analytics-session-created', '1')
  }
  return response
}
