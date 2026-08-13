import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  FIRST_TOUCH_COOKIE_NAME,
  SESSION_SOURCE_COOKIE_NAME,
  SOURCE_CONFIDENCE_COOKIE_NAME,
  SOURCE_DETAIL_COOKIE_NAME,
  SOURCE_EVIDENCE_COOKIE_NAME,
  SOURCE_REFERRER_COOKIE_NAME,
  detectAttribution,
} from './lib/attribution';

const SESSION_COOKIE_NAME = 'prop_session_id';

function setAttributionCookies(request: NextRequest, response: NextResponse) {
  const acceptsHtml = request.headers.get('accept')?.includes('text/html')
  if (request.method !== 'GET' || !acceptsHtml) return response

  const attribution = detectAttribution(request.url, request.headers.get('referer'))
  const hasActiveSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value)
  const hasNewSource = attribution.evidence !== 'direct'
  if (hasActiveSession && !hasNewSource) return response

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 30,
    path: '/',
  }
  response.cookies.set(SESSION_SOURCE_COOKIE_NAME, attribution.sourcePlatform, cookieOptions)
  response.cookies.set(SOURCE_EVIDENCE_COOKIE_NAME, attribution.evidence, cookieOptions)
  response.cookies.set(SOURCE_CONFIDENCE_COOKIE_NAME, attribution.confidence, cookieOptions)
  if (attribution.detail) response.cookies.set(SOURCE_DETAIL_COOKIE_NAME, attribution.detail, cookieOptions)
  else response.cookies.delete(SOURCE_DETAIL_COOKIE_NAME)
  if (attribution.referrerHost) response.cookies.set(SOURCE_REFERRER_COOKIE_NAME, attribution.referrerHost, cookieOptions)
  else response.cookies.delete(SOURCE_REFERRER_COOKIE_NAME)

  if (!request.cookies.get(FIRST_TOUCH_COOKIE_NAME)?.value) {
    response.cookies.set(FIRST_TOUCH_COOKIE_NAME, attribution.sourcePlatform, { ...cookieOptions, maxAge: 60 * 60 * 24 * 365 })
  }
  return response
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // ตรวจสอบว่าถ้าเข้าผ่าน .vercel.app
  if (hostname.includes('terrahome-studio.vercel.app')) {
    // เปลี่ยน URL ปลายทางเป็น .com
    url.hostname = 'terrahome-studio.com';
    
    // บังคับเปลี่ยนเป็น https เสมอ
    url.protocol = 'https:';
    url.port = '';

    // ทำ 301 Permanent Redirect เพื่อบอก Google ว่าหน้าเว็บย้ายไปที่ .com ถาวร
    // Google จะเอา vercel.app ออกจากหน้าผลการค้นหา และโชว์ .com แทน
    return setAttributionCookies(request, NextResponse.redirect(url, 301));
  }

  return setAttributionCookies(request, NextResponse.next());
}

// กำหนดให้ middleware ทำงานกับทุก path (ยกเว้นพวกไฟล์ระบบ _next หรือรูปภาพ)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
