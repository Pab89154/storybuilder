import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function validateConfig(): string | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY'
  }
  if (
    supabaseUrl.includes('your-project') ||
    supabaseAnonKey === 'your-anon-key' ||
    supabaseAnonKey === 'your-publishable-key'
  ) {
    return 'Supabase environment variables still contain placeholder values'
  }
  try {
    const url = new URL(supabaseUrl)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return 'VITE_SUPABASE_URL must use HTTPS outside local development'
    }
  } catch {
    return 'VITE_SUPABASE_URL is not a valid absolute URL'
  }
  return null
}

let configError = validateConfig()
let configuredClient: SupabaseClient | null = null

if (!configError) {
  try {
    configuredClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  } catch {
    configError = 'Supabase client initialization failed'
  }
}

export const supabaseConfigError = configError
export const isSupabaseConfigured = configuredClient !== null

export const supabase: SupabaseClient = configuredClient
  ? configuredClient
  : (new Proxy(
      {},
      {
        get() {
          throw new Error('Supabase is not configured for this deployment.')
        },
      },
    ) as SupabaseClient)
