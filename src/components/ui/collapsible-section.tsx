import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  summary?: string
  defaultOpen?: boolean
  compact?: boolean
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = true,
  compact = false,
  actions,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={cn(compact ? 'space-y-1' : 'space-y-2', className)}>
      <div className="flex min-w-0 items-center gap-0.5">
        <button
          type="button"
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1 rounded-md text-left hover:bg-[var(--color-accent)]/60',
            compact ? 'px-1.5 py-0.5' : 'px-1 py-1',
          )}
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown
              className={cn(
                'shrink-0 text-[var(--color-muted-foreground)]',
                compact ? 'h-3 w-3' : 'h-4 w-4',
              )}
            />
          ) : (
            <ChevronRight
              className={cn(
                'shrink-0 text-[var(--color-muted-foreground)]',
                compact ? 'h-3 w-3' : 'h-4 w-4',
              )}
            />
          )}
          <span
            className={cn(
              'font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]',
              compact ? 'text-[10px]' : 'text-sm',
            )}
          >
            {title}
          </span>
          {!open && summary ? (
            <span
              className={cn(
                'min-w-0 truncate font-normal normal-case text-[var(--color-muted-foreground)]',
                compact ? 'text-[10px]' : 'text-xs',
              )}
            >
              — {summary}
            </span>
          ) : null}
        </button>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {open ? <div className={compact ? 'pb-1 pt-0.5' : undefined}>{children}</div> : null}
    </section>
  )
}
