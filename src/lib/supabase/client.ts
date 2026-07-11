import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

function createSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createSupabaseClient()
  : (new Proxy(
      {},
      {
        get() {
          throw new Error('Supabase is not configured for this deployment.')
        },
      },
    ) as SupabaseClient)
