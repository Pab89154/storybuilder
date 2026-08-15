import {
  AlertDialog,
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
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false)
              onRegister()
            }}
          >
            {t('auth.signUp')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onContinueGuest()
            }}
          >
            {t('auth.continueGuest')}
          </Button>
          <AlertDialogCancel>{t('sidebar.cancel')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
