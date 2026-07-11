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
import { Button } from '@/components/ui/button'
import { useUiT } from '@/i18n/context'

interface GuestRegisterPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinueGuest: () => void
  onRegister: () => void
}

export function GuestRegisterPrompt({
  open,
  onOpenChange,
  onContinueGuest,
  onRegister,
}: GuestRegisterPromptProps) {
  const t = useUiT()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('auth.guestPromptTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('auth.guestPromptDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          <Button onClick={onRegister}>{t('auth.signUp')}</Button>
          <AlertDialogAction asChild>
            <Button variant="outline" onClick={onContinueGuest}>
              {t('auth.continueGuest')}
            </Button>
          </AlertDialogAction>
          <AlertDialogCancel>{t('sidebar.cancel')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
