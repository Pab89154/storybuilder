import { BookOpen, Plus, Sparkles, Users } from 'lucide-react'
import { useUiT } from '@/i18n/context'
import { cn } from '@/lib/utils'

const steps = [
  { icon: Plus, labelKey: 'sidebar.newStory', descKey: 'workspace.welcomeStep1' },
  { icon: Users, labelKey: 'setup.characters', descKey: 'workspace.welcomeStep2' },
  { icon: Sparkles, labelKey: 'workspace.generate', descKey: 'workspace.welcomeStep3' },
] as const

export function WelcomeScreen() {
  const t = useUiT()

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-100/50 via-[var(--color-background)] to-amber-50/60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-1/4 h-72 w-72 rounded-full bg-[var(--color-primary)]/8 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-12 bottom-1/4 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-2xl">
        <div className="book-paper rounded-2xl border border-stone-200/80 px-6 py-10 shadow-lg sm:px-10 sm:py-12">
          <div className="mx-auto mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/20">
            <BookOpen className="h-9 w-9 text-[var(--color-primary)]" strokeWidth={1.75} />
          </div>

          <div className="text-center">
            <h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              {t('workspace.welcomeTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
              {t('workspace.welcomeHint')}
            </p>
          </div>

          <ol className="mt-10 grid gap-3 sm:grid-cols-3">
            {steps.map(({ icon: Icon, labelKey, descKey }, index) => (
              <li
                key={labelKey}
                className={cn(
                  'rounded-xl border border-stone-200/70 bg-white/70 px-4 py-4 text-left backdrop-blur-sm',
                  'transition-shadow hover:shadow-md',
                )}
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-xs font-bold tabular-nums text-[var(--color-primary)]">
                    {index + 1}
                  </span>
                  <Icon className="h-5 w-5 shrink-0 text-[var(--color-primary)]" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-semibold text-stone-900">{t(labelKey)}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                  {t(descKey)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
