/** Split a comma-separated character field into trimmed non-empty parts. */
export function splitCharacterList(value: string | undefined | null): string[] {
  if (!value?.trim()) return []
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Join list parts with ", " for storage and display. */
export function joinCharacterList(items: readonly string[]): string {
  return items.join(', ')
}

/** Format a field value for display, or return fallback when empty. */
export function formatCharacterListValue(value: string | undefined, fallback = ''): string {
  const items = splitCharacterList(value)
  if (items.length === 0) return fallback
  return joinCharacterList(items)
}

/** True when the field contains two or more comma-separated values. */
export function hasMultipleCharacterValues(value: string | undefined): boolean {
  return splitCharacterList(value).length > 1
}

type ListedFieldLabels = {
  none: string
  single: (item: string) => string
  multiple: (items: string[]) => string
}

/** Format a list field for AI prompts with singular/plural labels. */
export function formatListedField(
  value: string | undefined,
  labels: ListedFieldLabels,
): string {
  const items = splitCharacterList(value)
  if (items.length === 0) return labels.none
  if (items.length === 1) return labels.single(items[0]!)
  return labels.multiple(items)
}
