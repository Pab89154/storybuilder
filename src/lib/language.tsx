import type { Language } from '@/types/story'
import {
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
  STORY_LANGUAGES,
} from '@/lib/storyLanguageMeta'

export { LANGUAGE_FLAGS, LANGUAGE_LABELS, STORY_LANGUAGES }

export function languageFlag(language: Language): string {
  return LANGUAGE_FLAGS[language]
}

export function languageLabel(language: Language): string {
  return LANGUAGE_LABELS[language]
}

export function languageDisplay(language: Language): string {
  return `${languageFlag(language)} ${languageLabel(language)}`
}

interface LanguageFlagProps {
  language: Language
  showLabel?: boolean
  className?: string
}

export function LanguageFlag({ language, showLabel = false, className }: LanguageFlagProps) {
  const label = languageLabel(language)
  return (
    <span className={className} title={label}>
      {languageFlag(language)}
      {showLabel ? ` ${label}` : null}
    </span>
  )
}
