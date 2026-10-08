import { cn } from '@/lib/utils'

type StoryBuilderLogoProps = {
  className?: string
  alt?: string
  /** Prefer transparent mark in the app chrome; white-backed file for OG/share. */
  variant?: 'transparent' | 'solid'
}

/** Official StoryBuilder mark — use for brand spots (sidebar, welcome, workspace). */
export function StoryBuilderLogo({
  className,
  alt = 'StoryBuilder',
  variant = 'transparent',
}: StoryBuilderLogoProps) {
  const src = variant === 'solid' ? `${import.meta.env.BASE_URL}logo.png` : `${import.meta.env.BASE_URL}logo-transparent.png`
  return (
    <img
      src={src}
      alt={alt}
      className={cn('shrink-0 object-contain', className)}
      draggable={false}
    />
  )
}
