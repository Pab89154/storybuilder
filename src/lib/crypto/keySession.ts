let masterKey: CryptoKey | null = null

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
