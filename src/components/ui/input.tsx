import { forwardRef, type InputHTMLAttributes } from 'react'
import { scrollFocusedFieldIntoView } from '@/lib/mobileFocus'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, onFocus, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-[var(--color-input)] bg-white px-3 py-2 text-base ring-offset-white placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
        className,
      )}
      ref={ref}
      onFocus={(event) => {
        scrollFocusedFieldIntoView(event.currentTarget)
        onFocus?.(event)
      }}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
