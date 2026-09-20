import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/context/auth'
import { mapAuthError } from '@/lib/auth/errors'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { useUiT } from '@/i18n/context'

type AuthMode = 'signIn' | 'signUp' | 'forgot'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: AuthMode
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function AuthDialogForm({
  initialMode,
  onOpenChange,
}: {
  initialMode: AuthMode
  onOpenChange: (open: boolean) => void
}) {
  const t = useUiT()
  const {
    signIn,
    signUp,
    signInWithOAuth,
    requestPasswordReset,
    needsOAuthUnlock,
    oauthRecoveryKey,
    clearOAuthRecoveryKey,
    unlockWithRecovery,
    signOut,
  } = useAuth()
  const formId = useId()
  const emailInputRef = useRef<HTMLInputElement>(null)
  const recoveryInputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryUnlockKey, setRecoveryUnlockKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(oauthRecoveryKey)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showOAuthUnlock = needsOAuthUnlock && !recoveryKey

  useEffect(() => {
    if (oauthRecoveryKey) {
      setRecoveryKey(oauthRecoveryKey)
      setMessage(t('auth.recoveryKeyHint'))
    }
  }, [oauthRecoveryKey, t])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (showOAuthUnlock) recoveryInputRef.current?.focus()
      else emailInputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [showOAuthUnlock])

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError(null)
    setMessage(null)
    setRecoveryKey(null)
    setPassword('')
    setRecoveryUnlockKey('')
  }

  const validate = (): string | null => {
    if (showOAuthUnlock) {
      if (!recoveryUnlockKey.trim()) return t('auth.recoveryKeyRequired')
      return null
    }
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return t('auth.emailRequired')
    if (!isValidEmail(trimmedEmail)) return t('auth.invalidEmail')
    if (mode !== 'forgot') {
      if (!password) return t('auth.passwordRequired')
      if (mode === 'signUp' && password.length < 6) return t('auth.weakPassword')
    }
    return null
  }

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return
    if (!next && needsOAuthUnlock && !oauthRecoveryKey) {
      void signOut().catch(() => undefined)
    }
    if (!next && oauthRecoveryKey) clearOAuthRecoveryKey()
    onOpenChange(next)
  }

  const handleGitHub = async () => {
    if (submittingRef.current) return
    setError(null)
    setMessage(null)
    if (!isSupabaseConfigured) {
      setError(t('auth.configMissing'))
      return
    }
    submittingRef.current = true
    setIsSubmitting(true)
    try {
      await signInWithOAuth('github')
    } catch (submitError) {
      setError(mapAuthError(submitError, t))
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (submittingRef.current) return

    setError(null)
    setMessage(null)

    if (!isSupabaseConfigured) {
      setError(t('auth.configMissing'))
      return
    }

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)
    try {
      if (showOAuthUnlock) {
        await unlockWithRecovery(recoveryUnlockKey.trim())
        onOpenChange(false)
        return
      }

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
          return
        }
        onOpenChange(false)
        return
      }

      const result = await signIn(email.trim(), password)
      if (result.recoveryKey) {
        setRecoveryKey(result.recoveryKey)
        setMessage(t('auth.recoveryKeyHint'))
        return
      }
      onOpenChange(false)
    } catch (submitError) {
      setError(mapAuthError(submitError, t))
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const title = showOAuthUnlock
    ? t('auth.unlockTitle')
    : mode === 'signIn'
      ? t('auth.signInTitle')
      : mode === 'signUp'
        ? t('auth.signUpTitle')
        : t('auth.forgotTitle')

  const description = showOAuthUnlock
    ? t('auth.unlockGitHubDescription')
    : mode === 'signIn'
      ? t('auth.signInDescription')
      : mode === 'signUp'
        ? t('auth.signUpDescription')
        : t('auth.forgotDescription')

  const submitLabel = isSubmitting
    ? t('common.loading')
    : showOAuthUnlock
      ? t('auth.unlock')
      : mode === 'signIn'
        ? t('auth.signIn')
        : mode === 'signUp'
          ? t('auth.signUp')
          : t('auth.sendReset')

  return (
    <DialogContent
      className="sm:max-w-md"
      closeLabel={t('auth.close')}
      onEscapeKeyDown={(event) => {
        if (isSubmitting) event.preventDefault()
      }}
      onPointerDownOutside={(event) => {
        if (isSubmitting) event.preventDefault()
      }}
      onInteractOutside={(event) => {
        if (isSubmitting) event.preventDefault()
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      {!isSupabaseConfigured ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="alert">
          {t('auth.configMissing')}
        </p>
      ) : null}

      {!showOAuthUnlock && !recoveryKey && mode !== 'forgot' ? (
        <div className="grid gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || !isSupabaseConfigured}
            onClick={() => void handleGitHub()}
          >
            {t('auth.continueWithGitHub')}
          </Button>
          <p className="text-center text-xs text-[var(--color-muted-foreground)]">{t('auth.orContinueWithEmail')}</p>
        </div>
      ) : null}

      <form id={formId} className="grid gap-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
        {showOAuthUnlock ? (
          <div className="space-y-2">
            <Label htmlFor="auth-recovery">{t('auth.recoveryKeyLabel')}</Label>
            <Input
              ref={recoveryInputRef}
              id="auth-recovery"
              name="recoveryKey"
              type="text"
              autoComplete="off"
              required
              disabled={isSubmitting || !isSupabaseConfigured}
              value={recoveryUnlockKey}
              onChange={(event) => setRecoveryUnlockKey(event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="auth-email">{t('auth.email')}</Label>
              <Input
                ref={emailInputRef}
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                disabled={isSubmitting || !isSupabaseConfigured}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'auth-error' : message ? 'auth-message' : undefined}
              />
            </div>

            {mode !== 'forgot' ? (
              <div className="space-y-2">
                <Label htmlFor="auth-password">{t('auth.password')}</Label>
                <Input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                  required
                  disabled={isSubmitting || !isSupabaseConfigured}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)}
                />
              </div>
            ) : null}
          </>
        )}

        {error ? (
          <p id="auth-error" className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p id="auth-message" className="text-sm text-[var(--color-muted-foreground)]" role="status">
            {message}
          </p>
        ) : null}
        {recoveryKey ? (
          <div className="rounded-lg border bg-[var(--color-card)] p-3 text-sm">
            <p className="mb-2 font-medium">{t('auth.recoveryKeyLabel')}</p>
            <code className="block break-all text-xs">{recoveryKey}</code>
          </div>
        ) : null}
      </form>

      <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
        {recoveryKey && !showOAuthUnlock ? (
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              clearOAuthRecoveryKey()
              onOpenChange(false)
            }}
          >
            {t('auth.close')}
          </Button>
        ) : (
          <Button
            type="submit"
            form={formId}
            disabled={isSubmitting || !isSupabaseConfigured}
            aria-busy={isSubmitting}
          >
            {submitLabel}
          </Button>
        )}

        {!showOAuthUnlock && !recoveryKey ? (
          <div className="flex flex-wrap gap-3 text-sm">
            {mode !== 'signIn' ? (
              <button
                type="button"
                className="underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                disabled={isSubmitting}
                onClick={() => switchMode('signIn')}
              >
                {t('auth.haveAccount')}
              </button>
            ) : null}
            {mode !== 'signUp' ? (
              <button
                type="button"
                className="underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                disabled={isSubmitting}
                onClick={() => switchMode('signUp')}
              >
                {t('auth.needAccount')}
              </button>
            ) : null}
            {mode !== 'forgot' ? (
              <button
                type="button"
                className="underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                disabled={isSubmitting}
                onClick={() => switchMode('forgot')}
              >
                {t('auth.forgotPassword')}
              </button>
            ) : null}
          </div>
        ) : null}

        {!recoveryKey ? (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
          >
            {t('sidebar.cancel')}
          </Button>
        ) : null}
      </DialogFooter>
    </DialogContent>
  )
}

export function AuthDialog({ open, onOpenChange, initialMode = 'signIn' }: AuthDialogProps) {
  const { needsOAuthUnlock, oauthRecoveryKey } = useAuth()
  const forcedOpen = open || needsOAuthUnlock || Boolean(oauthRecoveryKey)

  return (
    <Dialog
      open={forcedOpen}
      onOpenChange={(next) => {
        if (!next && (needsOAuthUnlock || oauthRecoveryKey)) {
          // AuthDialogForm handles sign-out / clear on cancel.
        }
        onOpenChange(next)
      }}
    >
      {forcedOpen ? (
        <AuthDialogForm
          key={`${initialMode}-${needsOAuthUnlock ? 'unlock' : 'auth'}-open`}
          initialMode={initialMode}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  )
}
