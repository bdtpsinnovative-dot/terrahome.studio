import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
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
