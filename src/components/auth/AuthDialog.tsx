import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/context/auth'
import { useUiT } from '@/i18n/context'

type AuthMode = 'signIn' | 'signUp' | 'forgot'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: AuthMode
}

export function AuthDialog({ open, onOpenChange, initialMode = 'signIn' }: AuthDialogProps) {
  const t = useUiT()
  const { signIn, signUp, requestPasswordReset } = useAuth()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setError(null)
    setMessage(null)
    setRecoveryKey(null)
    setPassword('')
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMode(initialMode)
      resetForm()
    }
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    setError(null)
    setMessage(null)
    setIsSubmitting(true)
    try {
      if (mode === 'forgot') {
        await requestPasswordReset(email.trim())
        setMessage(t('auth.resetEmailSent'))
        return
      }
      if (mode === 'signUp') {
        const result = await signUp(email.trim(), password)
        if (result.needsEmailConfirmation) {
          setMessage(t('auth.confirmEmail'))
          return
        }
        if (result.recoveryKey) {
          setRecoveryKey(result.recoveryKey)
          setMessage(t('auth.recoveryKeyHint'))
        } else {
          handleOpenChange(false)
        }
        return
      }
      await signIn(email.trim(), password)
      handleOpenChange(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('auth.genericError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === 'signIn'
              ? t('auth.signInTitle')
              : mode === 'signUp'
                ? t('auth.signUpTitle')
                : t('auth.forgotTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === 'signIn'
              ? t('auth.signInDescription')
              : mode === 'signUp'
                ? t('auth.signUpDescription')
                : t('auth.forgotDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="auth-email">{t('auth.email')}</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          {mode !== 'forgot' ? (
            <div className="space-y-2">
              <Label htmlFor="auth-password">{t('auth.password')}</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p> : null}
          {recoveryKey ? (
            <div className="rounded-lg border bg-[var(--color-card)] p-3 text-sm">
              <p className="mb-2 font-medium">{t('auth.recoveryKeyLabel')}</p>
              <code className="block break-all text-xs">{recoveryKey}</code>
            </div>
          ) : null}
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          <AlertDialogAction asChild>
            <Button disabled={isSubmitting} onClick={() => void handleSubmit()}>
              {mode === 'signIn'
                ? t('auth.signIn')
                : mode === 'signUp'
                  ? t('auth.signUp')
                  : t('auth.sendReset')}
            </Button>
          </AlertDialogAction>
          <div className="flex flex-wrap gap-2 text-sm">
            {mode !== 'signIn' ? (
              <button type="button" className="underline" onClick={() => { setMode('signIn'); resetForm() }}>
                {t('auth.haveAccount')}
              </button>
            ) : null}
            {mode !== 'signUp' ? (
              <button type="button" className="underline" onClick={() => { setMode('signUp'); resetForm() }}>
                {t('auth.needAccount')}
              </button>
            ) : null}
            {mode !== 'forgot' ? (
              <button type="button" className="underline" onClick={() => { setMode('forgot'); resetForm() }}>
                {t('auth.forgotPassword')}
              </button>
            ) : null}
          </div>
          <AlertDialogCancel>{t('sidebar.cancel')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
