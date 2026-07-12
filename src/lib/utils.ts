import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { countWords } from '@/lib/wordCount'

export function generateId(): string {
  return crypto.randomUUID()
}

/** Extracts a human-readable message from Errors, Supabase errors, or unknown throwables. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const parts = [record.message, record.details, record.hint]
      .filter((part): part is string => typeof part === 'string' && part.length > 0)
    if (parts.length > 0) return parts.join(' — ')
  }
  return fallback
}

export function truncateTitle(text: string, maxLength = 48): string {
  const cleaned = text.trim().replace(/\s+/g, ' ')
  if (cleaned.length <= maxLength) return cleaned || 'Untitled story'
  return `${cleaned.slice(0, maxLength).trim()}…`
}

export function formatRelativeTime(
  timestamp: number,
  t?: (key: string, values?: Record<string, string | number>) => string,
): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (t) {
    if (minutes < 1) return t('time.justNow')
    if (minutes < 60) return t('time.minutesAgo', { n: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('time.hoursAgo', { n: hours })
    const days = Math.floor(hours / 24)
    if (days < 7) return t('time.daysAgo', { n: days })
    return new Date(timestamp).toLocaleDateString()
  }
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
