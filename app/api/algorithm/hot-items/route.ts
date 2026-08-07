import { NextResponse } from 'next/server'
import { createClient } from '@/src/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const requestedLimit = Number(url.searchParams.get('limit') || 20)
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 100)) : 20
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_prop_hot_items', { limit_count: limit })

  if (error) {
    console.error('[hot-items] query failed', error)
    return NextResponse.json({ error: 'Unable to load Hot Items' }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}
