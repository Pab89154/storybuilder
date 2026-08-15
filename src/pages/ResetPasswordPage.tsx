import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth'
import { mapAuthError } from '@/lib/auth/errors'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { useUiT } from '@/i18n/context'

export function ResetPasswordPage() {
  const t = useUiT()
  const { completePasswordReset } = useAuth()
  const [password, setPassword] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)
    setMessage(null)

    if (!isSupabaseConfigured) {
      setError(t('auth.configMissing'))
      return
    }
    if (!password) {
      setError(t('auth.passwordRequired'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.weakPassword'))
      return
    }
    if (!recoveryKey.trim()) {
      setError(t('auth.recoveryKeyRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      await completePasswordReset(password, recoveryKey.trim())
      setMessage(t('auth.resetComplete'))
    } catch (submitError) {
      setError(mapAuthError(submitError, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-6">
      <div className="w-full max-w-md rounded-xl border bg-[var(--color-card)] p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">{t('auth.resetPageTitle')}</h1>
        <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">{t('auth.resetPageDescription')}</p>

        {!isSupabaseConfigured ? (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="alert">
            {t('auth.configMissing')}
          </p>
        ) : null}

        <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="reset-password">{t('auth.newPassword')}</Label>
            <Input
              id="reset-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              disabled={isSubmitting || !isSupabaseConfigured}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-recovery">{t('auth.recoveryKeyLabel')}</Label>
            <Input
              id="reset-recovery"
              name="recoveryKey"
              autoComplete="off"
              required
              disabled={isSubmitting || !isSupabaseConfigured}
              value={recoveryKey}
              onChange={(event) => setRecoveryKey(event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-green-700" role="status">
              {message}
            </p>
          ) : null}
          <Button type="submit" disabled={isSubmitting || !isSupabaseConfigured} aria-busy={isSubmitting}>
            {isSubmitting ? t('common.loading') : t('auth.resetPassword')}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link to="/">{t('auth.backToApp')}</Link>
          </Button>
        </form>
      </div>
    </div>
  )
}
