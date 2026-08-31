// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zexflchjcycxrpjkuews.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGZsY2hqY3ljeHJwamt1ZXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzMyNTEsImV4cCI6MjA4MDc0OTI1MX0.Hw3dJqP6-bpmqMW56pGHB1-Y2hN9tjCKNq9u2BnyeTk'

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          try {
            return cookieStore.getAll()
          } catch {
            return []
          }
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
