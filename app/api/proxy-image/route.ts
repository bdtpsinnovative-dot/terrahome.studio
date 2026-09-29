import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const ALLOWED_HOSTNAMES = [
  'r2.dev',
  'supabase.co',
  'terrahome-studio.com',
  'terrahome.studio',
  'cloudflare.com',
]

function isAllowedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    return ALLOWED_HOSTNAMES.some(domain => parsed.hostname.endsWith(domain))
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get('url')

  if (!targetUrl || !isAllowedUrl(targetUrl)) {
    return NextResponse.json({ error: 'Invalid or disallowed image URL' }, { status: 400 })
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'Accept': 'image/*',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: res.status })
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await res.arrayBuffer()

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error proxying image' }, { status: 500 })
  }
}
