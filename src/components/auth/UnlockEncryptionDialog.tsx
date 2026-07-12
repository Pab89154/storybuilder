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
import { getErrorMessage } from '@/lib/utils'

export function UnlockEncryptionDialog() {
  const t = useUiT()
  const { user, encryptionReady, unlockEncryption } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)

  const open = Boolean(user && !encryptionReady) || recoveryKey !== null

  const handleUnlock = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await unlockEncryption(password)
      setPassword('')
      if (result.recoveryKey) {
        setRecoveryKey(result.recoveryKey)
      }
    } catch (unlockError) {
      setError(getErrorMessage(unlockError, t('auth.genericError')))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (recoveryKey) {
    return (
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('auth.recoveryKeyLabel')}</AlertDialogTitle>
            <AlertDialogDescription>{t('auth.recoveryKeyHint')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border bg-[var(--color-card)] p-3">
            <code className="block break-all text-xs">{recoveryKey}</code>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Button onClick={() => setRecoveryKey(null)}>{t('auth.unlock')}</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('auth.unlockTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('auth.unlockDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="unlock-password">{t('auth.password')}</Label>
          <Input
            id="unlock-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled>{t('sidebar.cancel')}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button disabled={isSubmitting || !password} onClick={() => void handleUnlock()}>
              {t('auth.unlock')}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
