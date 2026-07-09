import { EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBlindKidMode } from '@/context/blindKidMode'
import { useUiT } from '@/i18n/context'
import { cn } from '@/lib/utils'

export function BlindKidModeToggle({
  className,
  size = 'default',
  variant = 'icon',
}: {
  className?: string
  size?: 'default' | 'compact' | 'rail'
  variant?: 'icon' | 'menu'
}) {
  const t = useUiT()
  const { blindKidMode, toggleBlindKidMode } = useBlindKidMode()

  const label = blindKidMode ? t('blindKid.disable') : t('blindKid.enable')

  if (variant === 'menu') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'w-full justify-start gap-2 text-[var(--color-muted-foreground)]',
          blindKidMode && 'text-[var(--color-primary)] hover:text-[var(--color-primary)]',
          className,
        )}
        onClick={toggleBlindKidMode}
        title={label}
        aria-label={label}
        aria-pressed={blindKidMode}
      >
        <EyeOff className="h-4 w-4" strokeWidth={1.75} />
        {label}
      </Button>
    )
  }

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
        blindKidMode && 'text-[var(--color-primary)] hover:text-[var(--color-primary)]',
        className,
      )}
      onClick={toggleBlindKidMode}
      title={label}
      aria-label={label}
      aria-pressed={blindKidMode}
    >
      <EyeOff className={iconClass} strokeWidth={1.75} />
    </Button>
  )
}
