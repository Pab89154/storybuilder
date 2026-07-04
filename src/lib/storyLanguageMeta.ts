import type { UiLocale } from '@/i18n/types'
import type { Language } from '@/types/story'

export const STORY_LANGUAGES: readonly Language[] = ['en', 'es', 'zh', 'ar', 'fr', 'de'] as const

export const LANGUAGE_I18N_KEYS: Record<Language, string> = {
  en: 'language.english',
  es: 'language.spanish',
  zh: 'language.chinese',
  ar: 'language.arabic',
  fr: 'language.french',
  de: 'language.german',
}

export const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  zh: '🇨🇳',
  ar: '🇸🇦',
  fr: '🇫🇷',
  de: '🇩🇪',
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  zh: '中文',
  ar: 'العربية',
  fr: 'Français',
  de: 'Deutsch',
}

export const LANGUAGE_ENGLISH_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Spanish',
  zh: 'Mandarin Chinese',
  ar: 'Arabic',
  fr: 'French',
  de: 'German',
}

export function defaultStoryLanguage(uiLocale: UiLocale): Language {
  return uiLocale
}

export function defaultDuplicateTargetLanguage(sourceLanguage: Language): Language {
  return STORY_LANGUAGES.find((language) => language !== sourceLanguage) ?? 'en'
}

export function defaultChapterTitle(language: Language, chapterNumber: number): string {
  switch (language) {
    case 'es':
      return `Capítulo ${chapterNumber}`
    case 'zh':
      return `第${chapterNumber}章`
    case 'ar':
      return `الفصل ${chapterNumber}`
    case 'fr':
      return `Chapitre ${chapterNumber}`
    case 'de':
      return `Kapitel ${chapterNumber}`
    default:
      return `Chapter ${chapterNumber}`
  }
}

export function finaleChapterTitle(language: Language): string {
  switch (language) {
    case 'es':
      return 'Final'
    case 'zh':
      return '大结局'
    case 'ar':
      return 'النهاية'
    case 'fr':
      return 'Final'
    case 'de':
      return 'Finale'
    default:
      return 'Finale'
  }
}

export function finaleChapterBrief(language: Language): string {
  switch (language) {
    case 'es':
      return 'Capítulo final que concluye la historia.'
    case 'zh':
      return '结束故事的最后一章。'
    case 'ar':
      return 'الفصل الأخير الذي يختتم القصة.'
    case 'fr':
      return 'Chapitre final qui conclut l’histoire.'
    case 'de':
      return 'Letztes Kapitel, das die Geschichte abschließt.'
    default:
      return 'Final chapter that concludes the story.'
  }
}

export function untitledStoryTitle(language: Language): string {
  switch (language) {
    case 'es':
      return 'Historia sin título'
    case 'zh':
      return '无标题故事'
    case 'ar':
      return 'قصة بلا عنوان'
    case 'fr':
      return 'Histoire sans titre'
    case 'de':
      return 'Geschichte ohne Titel'
    default:
      return 'Untitled story'
  }
}

export function contextOmitMarker(language: Language): string {
  switch (language) {
    case 'es':
      return '\n\n[… texto anterior omitido por límite de contexto …]\n\n'
    case 'zh':
      return '\n\n[… 因上下文限制省略了较早的文本 …]\n\n'
    case 'ar':
      return '\n\n[… تم حذف النص السابق بسبب حد السياق …]\n\n'
    case 'fr':
      return '\n\n[… texte précédent omis en raison de la limite de contexte …]\n\n'
    case 'de':
      return '\n\n[… früherer Text wegen Kontextlimit ausgelassen …]\n\n'
    default:
      return '\n\n[… earlier text omitted due to context limit …]\n\n'
  }
}

export function generationTemperature(language: Language): number {
  return language === 'en' ? 0.75 : 0.55
}
