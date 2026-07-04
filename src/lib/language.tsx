import type { Language } from '@/types/story'
import {
  LANGUAGE_FLAGS,
  LANGUAGE_I18N_KEYS,
  LANGUAGE_LABELS,
  STORY_LANGUAGES,
} from '@/lib/storyLanguageMeta'

export { LANGUAGE_FLAGS, LANGUAGE_LABELS, STORY_LANGUAGES }

export function languageFlag(language: Language): string {
  return LANGUAGE_FLAGS[language]
}

export function languageLabel(
  language: Language,
  t?: (key: string) => string,
): string {
  if (t) return t(LANGUAGE_I18N_KEYS[language])
  return LANGUAGE_LABELS[language]
}

export function languageDisplay(
  language: Language,
  t?: (key: string) => string,
): string {
  return `${languageFlag(language)} ${languageLabel(language, t)}`
}

interface LanguageFlagProps {
  language: Language
  showLabel?: boolean
  className?: string
  t?: (key: string) => string
}

export function LanguageFlag({ language, showLabel = false, className, t }: LanguageFlagProps) {
  const label = languageLabel(language, t)
  return (
    <span className={className} title={label}>
      {languageFlag(language)}
      {showLabel ? ` ${label}` : null}
    </span>
  )
}
