// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined

export function createClient() {
  if (!browserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gshppxgvdrmbfcxsxeph.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaHBweGd2ZHJtYmZjeHN4ZXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMjQzODAsImV4cCI6MjEwNzYwMDM4MH0.lhpLOeb7oY0e-ZCIgSBgzHfPAgAzK8eqFgUPg9te8XM'

    browserClient = createBrowserClient(
      supabaseUrl,
      supabaseKey
    )
  }

  return browserClient
}

function isInvalidRefreshTokenError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /invalid refresh token|refresh token not found/i.test(message)
}

/**
 * Reads the browser session and clears a revoked refresh token locally.
 * A revoked token cannot be repaired; the user must sign in again.
 */
export async function getSafeSession() {
  const client = createClient()
  let error: unknown = null

  try {
    const { data, error: sessionError } = await client.auth.getSession()
    if (!sessionError) return data.session
    error = sessionError
  } catch (caughtError) {
    error = caughtError
  }

  if (isInvalidRefreshTokenError(error)) {
    await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
  } else if (error) {
    console.error('Unable to restore Supabase session:', error)
  }

  return null
}
