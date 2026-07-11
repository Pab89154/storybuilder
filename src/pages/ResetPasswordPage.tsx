import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth'
import { useUiT } from '@/i18n/context'

export function ResetPasswordPage() {
  const t = useUiT()
  const { completePasswordReset } = useAuth()
  const [password, setPassword] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.title = t('auth.resetPageTitle')
  }, [t])

  const handleSubmit = async () => {
    setError(null)
    setMessage(null)
    setIsSubmitting(true)
    try {
      await completePasswordReset(password, recoveryKey.trim())
      setMessage(t('auth.resetComplete'))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('auth.genericError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-6">
      <div className="w-full max-w-md rounded-xl border bg-[var(--color-card)] p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">{t('auth.resetPageTitle')}</h1>
        <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">{t('auth.resetPageDescription')}</p>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="reset-password">{t('auth.newPassword')}</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-recovery">{t('auth.recoveryKeyLabel')}</Label>
            <Input
              id="reset-recovery"
              value={recoveryKey}
              onChange={(event) => setRecoveryKey(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          <Button disabled={isSubmitting || !password || !recoveryKey} onClick={() => void handleSubmit()}>
            {t('auth.resetPassword')}
          </Button>
        </div>
      </div>
    </div>
  )
}
