import {
  deriveKeyFromPassword,
  deriveKeyFromRecoveryKey,
  encryptWithKey,
  generateMasterKey,
  generateRecoveryKey,
  generateSalt,
  hashRecoveryKey,
  unwrapMasterKey,
  wrapMasterKey,
} from '@/lib/crypto/encryption'
import { setMasterKey } from '@/lib/crypto/keySession'
import { supabase } from '@/lib/supabase/client'

export async function setupUserEncryption(password: string): Promise<{ recoveryKey: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const salt = generateSalt()
  const recoveryKey = generateRecoveryKey()
  const passwordKey = await deriveKeyFromPassword(password, salt)
  const recoveryCryptoKey = await deriveKeyFromRecoveryKey(recoveryKey)
  const master = await generateMasterKey()
  const encryptedMasterKey = await wrapMasterKey(master, passwordKey)
  const encryptedMasterKeyRecovery = await wrapMasterKey(master, recoveryCryptoKey)
  const recoveryKeyHash = await hashRecoveryKey(recoveryKey)

  const { error } = await supabase.from('user_encryption_keys').insert({
    user_id: user.id,
    salt,
    encrypted_master_key: encryptedMasterKey,
    encrypted_master_key_recovery: encryptedMasterKeyRecovery,
    recovery_key_hash: recoveryKeyHash,
  })
  if (error) throw error

  setMasterKey(master)
  return { recoveryKey }
}

export async function unlockUserEncryption(password: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('user_encryption_keys')
    .select('salt, encrypted_master_key')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Encryption keys not found for this account')

  const passwordKey = await deriveKeyFromPassword(password, data.salt)
  const master = await unwrapMasterKey(data.encrypted_master_key, passwordKey)
  setMasterKey(master)
}

export async function recoverUserEncryption(
  recoveryKey: string,
  newPassword: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('user_encryption_keys')
    .select('salt, encrypted_master_key_recovery, recovery_key_hash')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Encryption keys not found for this account')

  const recoveryHash = await hashRecoveryKey(recoveryKey)
  if (recoveryHash !== data.recovery_key_hash) {
    throw new Error('Invalid recovery key')
  }

  const recoveryCryptoKey = await deriveKeyFromRecoveryKey(recoveryKey)
  const master = await unwrapMasterKey(data.encrypted_master_key_recovery, recoveryCryptoKey)
  const salt = generateSalt()
  const passwordKey = await deriveKeyFromPassword(newPassword, salt)
  const encryptedMasterKey = await wrapMasterKey(master, passwordKey)
  const encryptedMasterKeyRecovery = await wrapMasterKey(master, recoveryCryptoKey)

  const { error: updateError } = await supabase
    .from('user_encryption_keys')
    .update({
      salt,
      encrypted_master_key: encryptedMasterKey,
      encrypted_master_key_recovery: encryptedMasterKeyRecovery,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
  if (updateError) throw updateError

  setMasterKey(master)
}

export async function rewrapMasterKeyAfterPasswordChange(
  password: string,
  recoveryKey: string,
): Promise<void> {
  await recoverUserEncryption(recoveryKey, password)
}

export async function sendRecoveryKeyEmail(recoveryKey: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return

  await supabase.functions.invoke('send-recovery-email', {
    body: { recoveryKey },
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
}

export async function encryptStoryPayload(payload: unknown): Promise<string> {
  const { requireMasterKey } = await import('@/lib/crypto/keySession')
  return encryptWithKey(payload, requireMasterKey())
}

export async function decryptStoryPayload<T>(payload: string): Promise<T> {
  const { requireMasterKey } = await import('@/lib/crypto/keySession')
  const { decryptWithKey } = await import('@/lib/crypto/encryption')
  return decryptWithKey<T>(payload, requireMasterKey())
}
