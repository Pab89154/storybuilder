import type { Language } from '@/types/story'
import { contextOmitMarker } from '@/lib/storyLanguageMeta'

/** Rough token estimate for MLC (no tokenizer on main thread). */
const CHARS_PER_TOKEN = 4

/** Room for system prompt + model completion within a 4096 window. */
export const MAX_USER_PROMPT_TOKENS = 3000

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Keeps the end of long story context so recent chapters stay in the prompt.
 */
export function truncateToTokenBudget(
  text: string,
  maxTokens: number,
  language: Language = 'en',
): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const maxChars = maxTokens * CHARS_PER_TOKEN
  if (trimmed.length <= maxChars) return trimmed

  const marker = contextOmitMarker(language)

  const bodyBudget = Math.max(500, maxChars - marker.length)
  return marker + trimmed.slice(-bodyBudget)
}
