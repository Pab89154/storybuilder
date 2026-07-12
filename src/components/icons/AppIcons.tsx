import type { ReactNode, SVGProps } from 'react'
import { cn } from '@/lib/utils'

const iconClass = 'inline-block shrink-0'

type IconProps = SVGProps<SVGSVGElement> & { className?: string }

function BaseIcon({ className, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(iconClass, className)}
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconShare({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <circle cx="18" cy="5" r="2.25" />
      <circle cx="6" cy="12" r="2.25" />
      <circle cx="18" cy="19" r="2.25" />
      <path d="M8.2 10.7 15.8 6.3" />
      <path d="M8.2 13.3 15.8 17.7" />
    </BaseIcon>
  )
}

export function IconShareLink({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <path d="M10 13a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 1 0-5-5L11.5 7" />
      <path d="M14 11a3.5 3.5 0 0 0-5 0L6.5 13.5a3.5 3.5 0 1 0 5 5L12.5 17" />
    </BaseIcon>
  )
}

export function IconPencil({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </BaseIcon>
  )
}

export function IconDownload({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </BaseIcon>
  )
}

export function IconSparkles({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <path d="M12 3 13.2 8.8 19 10l-5.8 1.2L12 17l-1.2-5.8L5 10l5.8-1.2Z" />
      <path d="M5 4.5 5.5 6.5 7.5 7 5.5 7.5 5 9.5 4.5 7.5 2.5 7 4.5 6.5Z" />
      <path d="M19 15.5 19.4 17 20.9 17.4 19.4 17.8 19 19.3 18.6 17.8 17.1 17.4 18.6 17Z" />
    </BaseIcon>
  )
}

export function IconPlus({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  )
}

export function IconSearch({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </BaseIcon>
  )
}

export function IconTrash({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7l1 13h6l1-13" />
    </BaseIcon>
  )
}

export function IconUser({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </BaseIcon>
  )
}

export function IconLogOut({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h7A1.5 1.5 0 0 1 20 5.5v13A1.5 1.5 0 0 1 18.5 20h-7A1.5 1.5 0 0 1 10 18.5V17" />
      <path d="M3 12h11" />
      <path d="m12 8.5 3.5 3.5L12 15.5" />
    </BaseIcon>
  )
}

export function IconEye({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <path d="M2.5 12C4.5 7.5 8 5 12 5s7.5 2.5 9.5 7c-2 4.5-5.5 7-9.5 7s-7.5-2.5-9.5-7Z" />
      <circle cx="12" cy="12" r="2.5" />
    </BaseIcon>
  )
}

export function IconEyeOff({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A2.5 2.5 0 0 0 12 15a2.5 2.5 0 0 0 2.4-1.8" />
      <path d="M6.7 6.8C8.4 5.6 10.1 5 12 5c4 0 7.5 2.5 9.5 7a11.7 11.7 0 0 1-3.2 4.2" />
      <path d="M9.9 17.1A10.8 10.8 0 0 1 12 19c-4 0-7.5-2.5-9.5-7a12.8 12.8 0 0 1 2.7-3.6" />
    </BaseIcon>
  )
}

export function IconMoon({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4 6.5 6.5 0 1 0 20 14.5Z" />
    </BaseIcon>
  )
}

export function IconSun({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2.5" />
      <path d="M12 19v2.5" />
      <path d="M4.2 4.2 6 6" />
      <path d="M18 18l1.8 1.8" />
      <path d="M2.5 12H5" />
      <path d="M19 12h2.5" />
      <path d="M4.2 19.8 6 18" />
      <path d="M18 6l1.8-1.8" />
    </BaseIcon>
  )
}

export function IconCopy({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <rect x="8" y="8" width="11" height="11" rx="1.5" />
      <path d="M6 16H5.5A1.5 1.5 0 0 1 4 14.5v-9A1.5 1.5 0 0 1 5.5 4H14a1.5 1.5 0 0 1 1.5 1.5V6" />
    </BaseIcon>
  )
}

export function IconRevoke({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M8 7l1 13h6l1-13" />
    </BaseIcon>
  )
}
