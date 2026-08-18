// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Supabase requests include live stock and the Prop hot-item RPC. Do not
      // let Next's patched fetch reuse an older response for these queries.
      global: {
        fetch(input, init) {
          return globalThis.fetch(input, { ...init, cache: 'no-store' })
        },
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ส่วนนี้ดักไว้เผื่อเรียกใช้ใน Server Component ที่เป็นข้อมูลอ่านอย่างเดียว (Read-only)
          }
        },
      },
    }
  )
}
