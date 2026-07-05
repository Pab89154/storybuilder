import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { LanguageSelect } from '@/components/story/LanguageSelect'
import { useUiT } from '@/i18n/context'
import { readUiLocale } from '@/i18n/uiLocale'
import { defaultStoryLanguage } from '@/lib/storyLanguageMeta'
import {
  DEFAULT_READER_AGE,
  READER_AGE_OPTIONS,
  type Language,
} from '@/types/story'

interface NewStoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (language: Language, readerAge: number) => void | Promise<void>
}

export function NewStoryDialog({ open, onOpenChange, onCreate }: NewStoryDialogProps) {
  const t = useUiT()
  const [language, setLanguage] = useState<Language>(() => defaultStoryLanguage(readUiLocale()))
  const [readerAge, setReaderAge] = useState(String(DEFAULT_READER_AGE))

  const handleCreate = () => {
    void Promise.resolve(onCreate(language, Number(readerAge))).then(() => {
      onOpenChange(false)
      setReaderAge(String(DEFAULT_READER_AGE))
      setLanguage(defaultStoryLanguage(readUiLocale()))
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('sidebar.newStoryTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('sidebar.newStoryDescription')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-story-language">{t('workspace.storyLanguage')}</Label>
            <LanguageSelect id="new-story-language" value={language} onValueChange={setLanguage} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-story-age">{t('setup.readerAge')}</Label>
            <Select value={readerAge} onValueChange={setReaderAge}>
              <SelectTrigger id="new-story-age">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {READER_AGE_OPTIONS.map((age) => (
                  <SelectItem key={age} value={String(age)}>
                    {t(`setup.readerAgeYears.${age}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('sidebar.cancel')}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleCreate}>{t('sidebar.newStory')}</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
