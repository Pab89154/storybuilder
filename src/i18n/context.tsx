import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ar } from '@/i18n/messages/ar'
import { de } from '@/i18n/messages/de'
import { en } from '@/i18n/messages/en'
import { es } from '@/i18n/messages/es'
import { fr } from '@/i18n/messages/fr'
import { zh } from '@/i18n/messages/zh'
import { isRtlUiLocale } from '@/i18n/uiLocales'
import { readUiLocale, writeUiLocale } from '@/i18n/uiLocale'
import type { UiLocale, UiMessages } from '@/i18n/types'

const catalogs: Record<UiLocale, UiMessages> = { en, es, zh, ar, fr, de }

type InterpolateValues = Record<string, string | number>

function interpolate(template: string, values?: InterpolateValues): string {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`))
}

interface UiContextValue {
  locale: UiLocale
  setLocale: (locale: UiLocale) => void
  t: (key: string, values?: InterpolateValues) => string
  messages: UiMessages
}

const UiContext = createContext<UiContextValue | null>(null)

function resolveKey(messages: UiMessages, key: string): string | undefined {
  const parts = key.split('.')
  let node: unknown = messages
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

function applyDocumentLocale(locale: UiLocale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = isRtlUiLocale(locale) ? 'rtl' : 'ltr'
}

export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>(() => readUiLocale())

  const setLocale = useCallback((next: UiLocale) => {
    setLocaleState(next)
    writeUiLocale(next)
  }, [])

  useEffect(() => {
    applyDocumentLocale(locale)
  }, [locale])

  const messages = catalogs[locale]

  const t = useCallback(
    (key: string, values?: InterpolateValues) => {
      const raw = resolveKey(messages, key)
      if (raw === undefined) return key
      return interpolate(raw, values)
    },
    [messages],
  )

  const value = useMemo(
    () => ({ locale, setLocale, t, messages }),
    [locale, setLocale, t, messages],
  )

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUiLanguage() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUiLanguage must be used within UiLanguageProvider')
  return ctx
}

export function useUiT() {
  return useUiLanguage().t
}
