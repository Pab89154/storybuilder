import type { UiLocale } from '@/i18n/types'
import { LANGUAGE_FLAGS } from '@/lib/storyLanguageMeta'

export const UI_LOCALES: readonly UiLocale[] = ['en', 'es', 'zh', 'ar', 'fr', 'de'] as const

export const UI_LOCALE_NATIVE_LABELS: Record<UiLocale, string> = {
  en: 'English',
  es: 'Español',
  zh: '中文',
  ar: 'العربية',
  fr: 'Français',
  de: 'Deutsch',
}

export const UI_LOCALE_OPTIONS: Array<{ locale: UiLocale; flag: string; label: string }> =
  UI_LOCALES.map((locale) => ({
    locale,
    flag: LANGUAGE_FLAGS[locale],
    label: UI_LOCALE_NATIVE_LABELS[locale],
  }))

export function uiLocaleNativeLabel(locale: UiLocale): string {
  return UI_LOCALE_NATIVE_LABELS[locale]
}

export function isUiLocale(value: string): value is UiLocale {
  return (UI_LOCALES as readonly string[]).includes(value)
}

export function isRtlUiLocale(locale: UiLocale): boolean {
  return locale === 'ar'
}
