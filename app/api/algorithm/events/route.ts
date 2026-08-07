import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/src/supabase/server'
import {
  ALGORITHM_EVENT_TYPE,
  LAST_PRODUCT_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  VISITOR_COOKIE_NAME,
  classifyTraffic,
  getLocationData,
  getTrustedClientIp,
  getViewBucket,
  hashClientIp,
  isInternalIp,
} from '@/lib/algorithm'

export const dynamic = 'force-dynamic'

type ProductViewPayload = {
  event_type?: string
  product_id?: number
  collection_group_id?: string
  metadata?: Record<string, unknown>
}

function validMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).slice(0, 20))
}

export async function POST(request: Request) {
  let payload: ProductViewPayload

  try {
    payload = await request.json() as ProductViewPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    payload.event_type && payload.event_type !== ALGORITHM_EVENT_TYPE
    || !Number.isSafeInteger(payload.product_id)
    || !payload.collection_group_id
    || payload.collection_group_id.length > 200
  ) {
    return NextResponse.json({ error: 'Invalid product view payload' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: relation, error: relationError } = await supabase
    .from('collection_groups')
    .select('id, tag, products!inner(id, category_id)')
    .eq('id', payload.collection_group_id)
    .eq('products.id', payload.product_id)
    .eq('products.category_id', 'prop')
    .ilike('tag', '%prop%')
    .maybeSingle()

  if (relationError || !relation) {
    return NextResponse.json({ error: 'Product is not a Prop product' }, { status: 404 })
  }

  const cookieStore = await cookies()
  let visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value
  if (!visitorId || !/^[0-9a-f-]{36}$/i.test(visitorId)) {
    visitorId = randomUUID()
  }

  let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    sessionId = randomUUID()
  }
  const previousProductId = Number(cookieStore.get(LAST_PRODUCT_COOKIE_NAME)?.value)
  const validPreviousProductId = Number.isSafeInteger(previousProductId) ? previousProductId : null

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id || null
  const identityType = userId ? 'user' : 'visitor'
  const clientIp = getTrustedClientIp(request.headers)
  const internal = isInternalIp(clientIp)
  const userAgent = request.headers.get('user-agent')
  const traffic = classifyTraffic(userAgent, internal)
  const location = await getLocationData(request.headers, clientIp)

  const { error: insertError } = await supabase
    .from('algorithm_events')
    .insert({
      event_type: ALGORITHM_EVENT_TYPE,
      source_tag: 'prop',
      product_id: payload.product_id,
      collection_group_id: String(relation.id),
      user_id: userId,
      visitor_id: userId ? null : visitorId,
      identity_type: identityType,
      session_id: sessionId,
      previous_product_id: validPreviousProductId,
      view_bucket: getViewBucket(),
      ip_hash: hashClientIp(clientIp),
      country_code: location.countryCode,
      country: location.country,
      region: location.region,
      city: location.city,
      isp: location.isp,
      asn: location.asn,
      user_agent: userAgent?.slice(0, 1000) || null,
      referrer: request.headers.get('referer')?.slice(0, 2000) || null,
      traffic_type: traffic.trafficType,
      is_bot: traffic.isBot,
      is_internal: internal,
      is_countable: traffic.isCountable,
      metadata: validMetadata(payload.metadata),
    })

  if (insertError) {
    console.error('[algorithm-events] insert failed', {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
    })
    return NextResponse.json({ error: 'Unable to record product view' }, { status: 500 })
  }

  const response = NextResponse.json({ ok: true }, { status: 202 })
  if (!userId) {
    response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
  }
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 30,
    path: '/',
  })
  response.cookies.set(LAST_PRODUCT_COOKIE_NAME, String(payload.product_id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 30,
    path: '/',
  })

  return response
}
