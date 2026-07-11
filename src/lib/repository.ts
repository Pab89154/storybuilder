import type { User } from '@supabase/supabase-js'

export type AuthMode = 'guest' | 'authenticated'

export function getAuthMode(user: User | null, encryptionReady: boolean): AuthMode {
  if (user && encryptionReady) return 'authenticated'
  return 'guest'
}

export async function getStoryRepository(mode: AuthMode) {
  if (mode === 'authenticated') {
    return import('@/lib/cloud/database')
  }
  return import('@/lib/guest/database')
}
