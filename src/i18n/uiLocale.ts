import type { UiLocale } from '@/i18n/types'
import { isUiLocale } from '@/i18n/uiLocales'

const STORAGE_KEY = 'storybuilder-ui-locale'

function localeFromBrowserLanguage(): UiLocale {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('es')) return 'es'
  if (lang.startsWith('zh')) return 'zh'
  if (lang.startsWith('ar')) return 'ar'
  if (lang.startsWith('fr')) return 'fr'
  if (lang.startsWith('de')) return 'de'
  return 'en'
}

export function readUiLocale(): UiLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && isUiLocale(stored)) return stored
  } catch {
    /* ignore */
  }
  return localeFromBrowserLanguage()
}

export function writeUiLocale(locale: UiLocale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
}
