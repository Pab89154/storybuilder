import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUiT } from '@/i18n/context'
import { languageFlag, languageLabel } from '@/lib/language'
import { STORY_LANGUAGES } from '@/lib/storyLanguageMeta'
import type { Language } from '@/types/story'

function LanguageOption({ language }: { language: Language }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-base leading-none" aria-hidden>
        {languageFlag(language)}
      </span>
      {languageLabel(language)}
    </span>
  )
}

interface LanguageSelectProps {
  value: Language
  onValueChange: (language: Language) => void
  className?: string
  triggerClassName?: string
  id?: string
}

export function LanguageSelect({
  value,
  onValueChange,
  className,
  triggerClassName,
  id,
}: LanguageSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as Language)}>
      <SelectTrigger id={id} className={triggerClassName}>
        <SelectValue>
          <span className="flex items-center gap-2">
            <span className="text-base leading-none" aria-hidden>
              {languageFlag(value)}
            </span>
            {languageLabel(value)}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className={className}>
        {STORY_LANGUAGES.map((language) => (
          <SelectItem key={language} value={language}>
            <LanguageOption language={language} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function LanguageFilterSelect({
  value,
  onValueChange,
}: {
  value: 'all' | Language
  onValueChange: (value: 'all' | Language) => void
}) {
  const t = useUiT()

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as 'all' | Language)}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={t('language.all')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('language.all')}</SelectItem>
        {STORY_LANGUAGES.map((language) => (
          <SelectItem key={language} value={language}>
            <LanguageOption language={language} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { languageDisplay, languageFlag, languageLabel } from '@/lib/language'
