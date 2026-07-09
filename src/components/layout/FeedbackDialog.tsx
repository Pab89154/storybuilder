import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { useUiT } from '@/i18n/context'
import { openFeedbackIssue } from '@/lib/feedback'

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const t = useUiT()
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')

  const canSubmit = message.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    openFeedbackIssue({ message: message.trim(), contact: contact.trim() || undefined })
    onOpenChange(false)
    setMessage('')
    setContact('')
  }

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setMessage('')
      setContact('')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('feedback.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('feedback.description')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="feedback-message">{t('feedback.message')}</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('feedback.messagePlaceholder')}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-contact">{t('feedback.contact')}</Label>
            <Input
              id="feedback-contact"
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t('feedback.contactPlaceholder')}
            />
          </div>

          <p className="text-xs text-[var(--color-muted-foreground)]">{t('feedback.githubNote')}</p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('feedback.cancel')}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {t('feedback.submit')}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
