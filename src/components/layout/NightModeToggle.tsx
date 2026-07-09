import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNightMode } from '@/context/nightMode'
import { useUiT } from '@/i18n/context'
import { cn } from '@/lib/utils'

export function NightModeToggle({
  className,
  size = 'default',
}: {
  className?: string
  size?: 'default' | 'compact' | 'rail'
}) {
  const t = useUiT()
  const { nightMode, toggleNightMode } = useNightMode()

  const iconClass = 'h-5 w-5'
  const buttonClass =
    size === 'rail' ? 'h-9 w-9' : size === 'compact' ? 'h-8 w-8 shrink-0' : 'h-9 w-9'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        buttonClass,
        nightMode && 'text-[var(--color-primary)] hover:text-[var(--color-primary)]',
        className,
      )}
      onClick={toggleNightMode}
      title={nightMode ? t('nightMode.disable') : t('nightMode.enable')}
      aria-label={nightMode ? t('nightMode.disable') : t('nightMode.enable')}
      aria-pressed={nightMode}
    >
      {nightMode ? (
        <Sun className={iconClass} strokeWidth={1.75} />
      ) : (
        <Moon className={iconClass} strokeWidth={1.75} />
      )}
    </Button>
  )
}
