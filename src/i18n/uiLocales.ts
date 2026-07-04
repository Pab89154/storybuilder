import type { UiLocale } from '@/i18n/types'

export const UI_LOCALES: readonly UiLocale[] = ['en', 'es', 'zh', 'ar', 'fr', 'de'] as const

export const UI_LOCALE_OPTIONS: Array<{ locale: UiLocale; flag: string; label: string }> = [
  { locale: 'en', flag: '🇺🇸', label: 'EN' },
  { locale: 'es', flag: '🇪🇸', label: 'ES' },
  { locale: 'zh', flag: '🇨🇳', label: '中文' },
  { locale: 'ar', flag: '🇸🇦', label: 'AR' },
  { locale: 'fr', flag: '🇫🇷', label: 'FR' },
  { locale: 'de', flag: '🇩🇪', label: 'DE' },
]

export function isUiLocale(value: string): value is UiLocale {
  return (UI_LOCALES as readonly string[]).includes(value)
}

export function isRtlUiLocale(locale: UiLocale): boolean {
  return locale === 'ar'
}
