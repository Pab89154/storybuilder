import { useState } from 'react'
import { Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { LanguageSelect, languageDisplay } from '@/components/story/LanguageSelect'
import { useDuplicateStory } from '@/hooks/useDuplicateStory'
import { useUiT } from '@/i18n/context'
import { defaultDuplicateTargetLanguage } from '@/lib/storyLanguageMeta'
import type { Language, StoryWithDetails } from '@/types/story'

interface DuplicateStoryDialogProps {
  story: StoryWithDetails
  disabled?: boolean
  buttonSize?: 'default' | 'sm'
  buttonClassName?: string
}

export function DuplicateStoryDialog({
  story,
  disabled,
  buttonSize = 'default',
  buttonClassName,
}: DuplicateStoryDialogProps) {
  const t = useUiT()
  const { duplicateAndTranslate, isDuplicating, duplicateProgress } = useDuplicateStory()
  const [open, setOpen] = useState(false)
  const defaultTarget = defaultDuplicateTargetLanguage(story.language)
  const [targetLanguage, setTargetLanguage] = useState<Language>(defaultTarget)

  const handleDuplicate = async () => {
    await duplicateAndTranslate(story.id, targetLanguage)
    setOpen(false)
  }

  const isSameLanguage = targetLanguage === story.language
  const actionLabel = isSameLanguage ? t('duplicate.duplicate') : t('duplicate.duplicateTranslate')

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size={buttonClassName ? undefined : buttonSize}
          className={buttonClassName}
          disabled={disabled || isDuplicating}
        >
          {isDuplicating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {t('duplicate.button')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{actionLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('duplicate.descriptionDetail', { title: story.title })}{' '}
            {isSameLanguage ? t('duplicate.sameLanguage') : t('duplicate.translateDetail')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <Label className="mb-2 block text-sm">{t('duplicate.targetLanguage')}</Label>
          <LanguageSelect value={targetLanguage} onValueChange={setTargetLanguage} />
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            {t('duplicate.current')}: {languageDisplay(story.language)}
          </p>
        </div>

        {isDuplicating && duplicateProgress && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--color-secondary)] px-3 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {duplicateProgress}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDuplicating}>{t('duplicate.cancel')}</AlertDialogCancel>
          <Button disabled={isDuplicating} onClick={() => void handleDuplicate()}>
            {isDuplicating ? t('duplicate.working') : actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
