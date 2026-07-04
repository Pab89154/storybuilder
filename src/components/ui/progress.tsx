import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

export function Progress({
  className,
  value,
  indeterminate,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indeterminate?: boolean
}) {
  const showIndeterminate = indeterminate ?? value === undefined

  return (
    <ProgressPrimitive.Root
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-[var(--color-secondary)]', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full flex-1 bg-[var(--color-primary)]',
          showIndeterminate ? 'w-full animate-pulse opacity-80' : 'w-full transition-all',
        )}
        style={
          showIndeterminate ? undefined : { transform: `translateX(-${100 - (value ?? 0)}%)` }
        }
      />
    </ProgressPrimitive.Root>
  )
}
