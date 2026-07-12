import { exportMasterKey, importMasterKey } from '@/lib/crypto/encryption'

let masterKey: CryptoKey | null = null

const STORAGE_PREFIX = 'storybuilder-mk-'

export function setMasterKey(key: CryptoKey | null): void {
  masterKey = key
}

export function getMasterKey(): CryptoKey | null {
  return masterKey
}

export function requireMasterKey(): CryptoKey {
  if (!masterKey) throw new Error('Encryption key is not unlocked')
  return masterKey
}

export function clearMasterKey(): void {
  masterKey = null
}

/**
 * Persist the master key locally so it survives reloads and the user never has
 * to re-enter a password to unlock. The key stays on the device and is never
 * sent to the server; stories remain encrypted at rest in Supabase.
 */
export async function persistMasterKey(userId: string, key: CryptoKey): Promise<void> {
  try {
    const raw = await exportMasterKey(key)
    localStorage.setItem(STORAGE_PREFIX + userId, raw)
  } catch {
    // Non-fatal: the key still works for this session.
  }
}

export async function loadPersistedMasterKey(userId: string): Promise<CryptoKey | null> {
  const raw = localStorage.getItem(STORAGE_PREFIX + userId)
  if (!raw) return null
  try {
    const key = await importMasterKey(raw)
    masterKey = key
    return key
  } catch {
    localStorage.removeItem(STORAGE_PREFIX + userId)
    return null
  }
}

export function clearPersistedMasterKey(userId?: string): void {
  if (userId) {
    localStorage.removeItem(STORAGE_PREFIX + userId)
    return
  }
  for (const storageKey of Object.keys(localStorage)) {
    if (storageKey.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(storageKey)
    }
  }
}
