const PBKDF2_ITERATIONS = 310_000
const SALT_BYTES = 16
const KEY_BYTES = 32
const IV_BYTES = 12

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function importRawKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toArrayBuffer(raw), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export function generateSalt(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)))
}

export function generateRecoveryKey(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(KEY_BYTES)))
}

export function generateShareSecret(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(KEY_BYTES)))
}

export async function deriveKeyFromPassword(password: string, saltBase64: string): Promise<CryptoKey> {
  const salt = base64ToBytes(saltBase64)
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    passwordKey,
    KEY_BYTES * 8,
  )
  return importRawKey(new Uint8Array(bits))
}

export async function deriveKeyFromRecoveryKey(recoveryKeyBase64: string): Promise<CryptoKey> {
  const raw = base64ToBytes(recoveryKeyBase64)
  return importRawKey(raw)
}

export async function hashRecoveryKey(recoveryKeyBase64: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', toArrayBuffer(base64ToBytes(recoveryKeyBase64)))
  return bytesToBase64(new Uint8Array(digest))
}

export async function generateMasterKey(): Promise<CryptoKey> {
  const raw = crypto.getRandomValues(new Uint8Array(KEY_BYTES))
  return importRawKey(raw)
}

export async function exportMasterKey(masterKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', masterKey)
  return bytesToBase64(new Uint8Array(raw))
}

export async function importMasterKey(masterKeyBase64: string): Promise<CryptoKey> {
  return importRawKey(base64ToBytes(masterKeyBase64))
}

export async function encryptWithKey(value: unknown, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const encoded = new TextEncoder().encode(JSON.stringify(value))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    encoded,
  )
  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(cipher))}`
}

export async function decryptWithKey<T>(payload: string, key: CryptoKey): Promise<T> {
  const [ivBase64, cipherBase64] = payload.split(':')
  if (!ivBase64 || !cipherBase64) throw new Error('Invalid encrypted payload')
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(base64ToBytes(ivBase64)) },
    key,
    toArrayBuffer(base64ToBytes(cipherBase64)),
  )
  return JSON.parse(new TextDecoder().decode(plain)) as T
}

export async function wrapMasterKey(masterKey: CryptoKey, wrappingKey: CryptoKey): Promise<string> {
  const raw = await exportMasterKey(masterKey)
  return encryptWithKey({ masterKey: raw }, wrappingKey)
}

export async function unwrapMasterKey(payload: string, wrappingKey: CryptoKey): Promise<CryptoKey> {
  const data = await decryptWithKey<{ masterKey: string }>(payload, wrappingKey)
  return importMasterKey(data.masterKey)
}
