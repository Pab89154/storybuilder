import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUiLanguage } from '@/i18n/context'
import { UI_LOCALE_OPTIONS } from '@/i18n/uiLocales'
import type { UiLocale } from '@/i18n/types'
import { cn } from '@/lib/utils'

function LocaleOption({ locale, flag }: { locale: UiLocale; flag: string }) {
  const { t } = useUiLanguage()
  return (
    <span className="flex items-center gap-2">
      <span className="text-base leading-none" aria-hidden>
        {flag}
      </span>
      <span>{t(`locale.${locale}`)}</span>
    </span>
  )
}

export function UiLanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useUiLanguage()
  const current = UI_LOCALE_OPTIONS.find((opt) => opt.locale === locale) ?? UI_LOCALE_OPTIONS[0]

  return (
    <div className={cn('min-w-0', compact ? 'w-full' : 'w-full')}>
      <Select value={locale} onValueChange={(value) => setLocale(value as UiLocale)}>
        <SelectTrigger
          className={cn('h-8 w-full text-xs', compact && 'h-7')}
          aria-label={t('uiLanguage.aria')}
        >
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span className="text-sm leading-none" aria-hidden>
                {current.flag}
              </span>
              <span className="truncate">{current.label}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {UI_LOCALE_OPTIONS.map((opt) => (
            <SelectItem key={opt.locale} value={opt.locale}>
              <LocaleOption locale={opt.locale} flag={opt.flag} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
