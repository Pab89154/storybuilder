import { Sparkles } from 'lucide-react'
import { useUiT } from '@/i18n/context'

export function WelcomeScreen() {
  const t = useUiT()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <Sparkles className="h-12 w-12 text-[var(--color-primary)] opacity-60" />
      <div>
        <h2 className="text-xl font-semibold">{t('workspace.welcomeTitle')}</h2>
        <p className="mt-1 max-w-md text-[var(--color-muted-foreground)]">
          {t('workspace.welcomeHint')}
        </p>
      </div>
    </div>
  )
}
