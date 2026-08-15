import { getErrorMessage } from '@/lib/utils'

type Translate = (key: string) => string

function messageOf(error: unknown): string {
  return getErrorMessage(error, '').toLowerCase()
}

function statusOf(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const record = error as Record<string, unknown>
  if (typeof record.status === 'number') return record.status
  if (typeof record.statusCode === 'number') return record.statusCode
  return undefined
}

/** Map auth failures to localized, non-technical copy. */
export function mapAuthError(error: unknown, t: Translate): string {
  const message = messageOf(error)
  const status = statusOf(error)

  if (!message && status == null) return t('auth.genericError')

  if (
    message.includes('supabase is not configured') ||
    message.includes('missing vite_supabase')
  ) {
    return t('auth.configMissing')
  }

  if (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed')
  ) {
    return t('auth.networkError')
  }

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials') ||
    (status === 400 && message.includes('invalid'))
  ) {
    return t('auth.invalidCredentials')
  }

  if (
    message.includes('email not confirmed') ||
    message.includes('not confirmed')
  ) {
    return t('auth.emailNotConfirmed')
  }

  if (
    message.includes('user already registered') ||
    message.includes('already been registered')
  ) {
    return t('auth.emailAlreadyRegistered')
  }

  if (
    message.includes('password should be at least') ||
    message.includes('password is too short') ||
    message.includes('weak password')
  ) {
    return t('auth.weakPassword')
  }

  if (message.includes('invalid recovery key')) {
    return t('auth.invalidRecoveryKey')
  }

  if (message.includes('rate limit') || status === 429) {
    return t('auth.rateLimited')
  }

  // Avoid leaking raw provider/API text to end users.
  if (import.meta.env.DEV) {
    console.warn('[auth]', getErrorMessage(error, 'unknown auth error'))
  }
  return t('auth.genericError')
}
