'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/src/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type AnalyticsEvent = {
  event_type: 'page_view' | 'session_start' | 'session_heartbeat' | 'session_end' | 'cta' | 'journey'
  product_id?: number
  page_type?: string
  page_path?: string
  page_entity_id?: string
  page_instance_id?: string
  activity_interval_id?: string
  event_name?: string
  active_seconds?: number
  duration_seconds?: number
  next_page_type?: string
  next_product_id?: number
  journey_outcome?: string
  exit_type?: string
  is_bounce?: boolean
  is_quick_bounce?: boolean
  metadata?: Record<string, unknown>
}

type ActivePage = {
  pageType: string
  pagePath: string
  pageInstanceId: string
  pageEntityId: string | null
  productId: number | null
}

const TAB_KEY = 'prop_analytics_tab_id'
const ACTIVE_WINDOW_MS = 5 * 60 * 1000
const SAFETY_FLUSH_INTERVAL_MS = 3 * 60 * 1000

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function getTabId() {
  const existing = window.sessionStorage.getItem(TAB_KEY)
  if (existing) return existing
  const created = uuid()
  window.sessionStorage.setItem(TAB_KEY, created)
  return created
}

function classifyPage(pathname: string) {
  if (pathname === '/') return { pageType: 'home', entityId: null }
  if (pathname.startsWith('/prop/')) {
    const parts = pathname.split('/').filter(Boolean)
    return { pageType: 'product', entityId: parts[parts.length - 1] || null }
  }
  if (pathname === '/prop' || pathname.startsWith('/prop?')) return { pageType: 'prop_listing', entityId: null }
  if (pathname.startsWith('/journal')) return { pageType: 'journal', entityId: pathname.split('/')[2] || null }
  if (pathname.startsWith('/contact')) return { pageType: 'contact', entityId: null }
  if (pathname.startsWith('/cart')) return { pageType: 'cart', entityId: null }
  if (pathname.startsWith('/login')) return { pageType: 'login', entityId: null }
  return { pageType: 'other', entityId: null }
}

function allowedTrackingUrl() {
  const url = new URL(window.location.href)
  const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'category', 'filter', 'branch']
  const query = new URLSearchParams()
  for (const key of allowed) {
    const value = url.searchParams.get(key)
    if (value) query.set(key, value.slice(0, 200))
  }
  return `${url.origin}${url.pathname}${query.toString() ? `?${query.toString()}` : ''}`
}

function currentProductId() {
  const value = Number(document.querySelector<HTMLElement>('[data-prop-product-id]')?.dataset.propProductId)
  return Number.isSafeInteger(value) && value > 0 ? value : undefined
}

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pageStartedAtRef = useRef(0)
  const lastActivityAtRef = useRef(0)
  const pageInstanceRef = useRef<string | null>(null)
  const intervalIdRef = useRef<string | null>(null)
  const activeSecondsRef = useRef(0)
  const lastFlushedActiveRef = useRef(0)
  const sendRef = useRef<(event: AnalyticsEvent) => void>(() => undefined)
  const activePageRef = useRef<ActivePage | null>(null)
  const startedSessionRef = useRef(false)
  const pageCountRef = useRef(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isSubscribedRef = useRef(false)

  const send = useCallback((event: AnalyticsEvent) => {
    const body = {
      ...event,
      tracking_url: allowedTrackingUrl(),
      metadata: { ...(event.metadata || {}), tab_id: getTabId() },
    }
    void fetch('/api/algorithm/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      keepalive: event.event_type === 'session_end' || event.event_type === 'cta',
      body: JSON.stringify(body),
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    sendRef.current = send
  }, [send])

  // Setup Supabase Realtime Presence channel for live audience tracking
  useEffect(() => {
    const supabase = createClient()
    const tabId = getTabId()
    const channel = supabase.channel('prop-live-audience', {
      config: { presence: { key: tabId } },
    })
    channelRef.current = channel

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true
        const { pageType } = classifyPage(window.location.pathname)
        await channel.track({
          tab_id: tabId,
          page_type: pageType,
          page_path: window.location.pathname,
          product_id: currentProductId() || null,
          device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          online_at: new Date().toISOString(),
        })
      }
    })

    return () => {
      if (channelRef.current) {
        void channelRef.current.untrack()
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
        isSubscribedRef.current = false
      }
    }
  }, [])

  useEffect(() => {
    if (!pathname) return
    const { pageType, entityId } = classifyPage(pathname)
    const pageInstanceId = uuid()
    const intervalId = uuid()
    const previousPage = activePageRef.current
    const previousStartedAt = pageStartedAtRef.current
    const previousIntervalId = intervalIdRef.current
    const previousActiveSeconds = Math.floor(activeSecondsRef.current)
    const now = Date.now()

    pageInstanceRef.current = pageInstanceId
    intervalIdRef.current = intervalId
    pageStartedAtRef.current = now
    lastActivityAtRef.current = now
    activeSecondsRef.current = 0
    lastFlushedActiveRef.current = 0
    pageCountRef.current += 1

    // Update Realtime Presence state on route change
    if (channelRef.current && isSubscribedRef.current) {
      void channelRef.current.track({
        tab_id: getTabId(),
        page_type: pageType,
        page_path: pathname,
        product_id: currentProductId() || null,
        device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        online_at: new Date().toISOString(),
      })
    }

    if (previousPage) {
      sendRef.current({
        event_type: 'journey',
        page_type: previousPage.pageType,
        page_path: previousPage.pagePath,
        page_entity_id: previousPage.pageEntityId || undefined,
        page_instance_id: previousPage.pageInstanceId,
        activity_interval_id: previousIntervalId || undefined,
        product_id: previousPage.productId || undefined,
        duration_seconds: Math.min(Math.max(0, Math.floor((now - previousStartedAt) / 1000)), 86400),
        active_seconds: previousActiveSeconds,
        next_page_type: pageType,
        journey_outcome: pageType,
      })
    }
    activePageRef.current = { pageType, pagePath: pathname, pageInstanceId, pageEntityId: entityId, productId: currentProductId() || null }
    if (!startedSessionRef.current) {
      startedSessionRef.current = true
      sendRef.current({
        event_type: 'session_start',
        page_type: pageType,
        page_path: pathname,
        page_instance_id: pageInstanceId,
        event_name: 'session_start',
      })
    }
    sendRef.current({
      event_type: 'page_view',
      page_type: pageType,
      page_path: pathname,
      page_entity_id: entityId || undefined,
      page_instance_id: pageInstanceId,
      event_name: previousPage ? 'route_change' : 'page_load',
    })

    return undefined
  }, [pathname, searchParams, send])

  useEffect(() => {
    const markActivity = () => { lastActivityAtRef.current = Date.now() }
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll']
    activityEvents.forEach((event) => window.addEventListener(event, markActivity, { passive: true }))

    // Local in-memory active time counter (0 network traffic, 0 DB writes)
    const localTimer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !pageInstanceRef.current) return
      const now = Date.now()
      if (now - lastActivityAtRef.current > ACTIVE_WINDOW_MS) return
      activeSecondsRef.current += 1
    }, 1000)

    // Relaxed safety flush (every 3 minutes instead of 15 seconds) for long single-page stays
    const safetyFlush = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !pageInstanceRef.current || !intervalIdRef.current) return
      const now = Date.now()
      if (now - lastActivityAtRef.current > ACTIVE_WINDOW_MS) return
      const currentActive = Math.floor(activeSecondsRef.current)
      if (currentActive - lastFlushedActiveRef.current < 30) return
      lastFlushedActiveRef.current = currentActive
      const { pageType } = classifyPage(pathname || window.location.pathname)
      sendRef.current({
        event_type: 'session_heartbeat',
        page_type: pageType,
        page_path: window.location.pathname,
        page_instance_id: pageInstanceRef.current,
        activity_interval_id: intervalIdRef.current,
        product_id: currentProductId(),
        active_seconds: currentActive,
      })
    }, SAFETY_FLUSH_INTERVAL_MS)

    const handlePageHide = () => {
      if (!pageInstanceRef.current) return
      const { pageType } = classifyPage(window.location.pathname)
      const activeSeconds = Math.min(86400, Math.max(0, Math.floor(activeSecondsRef.current)))
      const isSessionBounce = pageCountRef.current <= 1
      sendRef.current({
        event_type: 'session_end',
        page_type: pageType,
        page_path: window.location.pathname,
        page_instance_id: pageInstanceRef.current,
        activity_interval_id: intervalIdRef.current || undefined,
        product_id: currentProductId(),
        active_seconds: activeSeconds,
        duration_seconds: activeSeconds,
        exit_type: pageType === 'product' ? 'product_exit' : 'other_exit',
        is_bounce: isSessionBounce,
        is_quick_bounce: isSessionBounce && activeSeconds < 15,
      })
    }
    const handleTrackedClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-analytics-event]') : null
      const eventName = target?.dataset.analyticsEvent
      if (!eventName) return
      const customProductName = target?.dataset.analyticsProductName
      sendRef.current({
        event_type: 'cta',
        page_type: classifyPage(window.location.pathname).pageType,
        page_path: window.location.pathname,
        product_id: currentProductId(),
        event_name: eventName,
        metadata: customProductName ? { target_product_name: customProductName } : undefined,
      })
    }
    const handleProductSelected = (event: Event) => {
      const detail = (event as CustomEvent<{ productId?: number; sku?: string }>).detail
      const productId = detail?.productId
      if (!Number.isSafeInteger(productId) || !productId || activePageRef.current?.productId === productId) return
      const previousPage = activePageRef.current
      const now = Date.now()
      const previousIntervalId = intervalIdRef.current
      const previousActiveSeconds = Math.floor(activeSecondsRef.current)

      if (previousPage) {
        sendRef.current({
          event_type: 'journey',
          page_type: 'product',
          page_path: previousPage.pagePath,
          page_entity_id: previousPage.pageEntityId || undefined,
          page_instance_id: previousPage.pageInstanceId,
          activity_interval_id: previousIntervalId || undefined,
          product_id: previousPage.productId || undefined,
          duration_seconds: Math.min(Math.max(0, Math.floor((now - pageStartedAtRef.current) / 1000)), 86400),
          active_seconds: previousActiveSeconds,
          next_page_type: 'product',
          next_product_id: productId,
          journey_outcome: 'product',
        })
      }
      const pageInstanceId = uuid()
      const intervalId = uuid()
      pageInstanceRef.current = pageInstanceId
      intervalIdRef.current = intervalId
      pageStartedAtRef.current = now
      lastActivityAtRef.current = now
      activeSecondsRef.current = 0
      lastFlushedActiveRef.current = 0
      activePageRef.current = { pageType: 'product', pagePath: window.location.pathname, pageInstanceId, pageEntityId: detail.sku || null, productId }
      pageCountRef.current += 1

      // Update Realtime Presence on product selection
      if (channelRef.current && isSubscribedRef.current) {
        void channelRef.current.track({
          tab_id: getTabId(),
          page_type: 'product',
          page_path: window.location.pathname,
          product_id: productId,
          device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          online_at: new Date().toISOString(),
        })
      }

      sendRef.current({
        event_type: 'page_view',
        page_type: 'product',
        page_path: window.location.pathname,
        page_entity_id: detail.sku,
        page_instance_id: pageInstanceId,
        product_id: productId,
        event_name: 'product_selected_without_reload',
      })
    }
    document.addEventListener('click', handleTrackedClick, true)
    window.addEventListener('prop-product-selected', handleProductSelected)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('click', handleTrackedClick, true)
      window.removeEventListener('prop-product-selected', handleProductSelected)
      window.clearInterval(localTimer)
      window.clearInterval(safetyFlush)
      activityEvents.forEach((event) => window.removeEventListener(event, markActivity))
    }
  }, [pathname])

  return null
}

export function trackAnalyticsCta(eventName: string, metadata?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const { pageType } = classifyPage(window.location.pathname)
  void fetch('/api/algorithm/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({
      event_type: 'cta',
      event_name: eventName,
      page_type: pageType,
      page_path: window.location.pathname,
      tracking_url: allowedTrackingUrl(),
      metadata,
    }),
  }).catch(() => undefined)
}
