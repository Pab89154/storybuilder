import type { Language } from '@/types/story'

const SPEECH_LOCALE: Record<Language, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  zh: 'zh-CN',
  ar: 'ar-SA',
}

export function speechLocaleForLanguage(language: Language): string {
  return SPEECH_LOCALE[language] ?? 'en-US'
}

export function speechLanguagePrefix(language: Language): string {
  return speechLocaleForLanguage(language).split('-')[0] ?? language
}
