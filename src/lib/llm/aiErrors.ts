/** Thrown when Gemini is temporarily overloaded (HTTP 503 / UNAVAILABLE). */
export class ModelBusyError extends Error {
  constructor() {
    super('The story AI is busy right now. Please try again in a moment.')
    this.name = 'ModelBusyError'
  }
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err ?? '')
}

/** Gemini capacity errors: "high demand", HTTP 503, status UNAVAILABLE. */
export function isModelBusyText(text: string): boolean {
  return (
    /\b503\b/.test(text) ||
    /\bUNAVAILABLE\b/i.test(text) ||
    /high demand/i.test(text) ||
    /model is currently experiencing/i.test(text) ||
    /story AI is busy/i.test(text)
  )
}

export function isModelBusyError(err: unknown): boolean {
  if (err instanceof ModelBusyError) return true
  if (err instanceof Error && err.name === 'ModelBusyError') return true
  return isModelBusyText(messageOf(err))
}

export function isRateLimitError(err: unknown): boolean {
  const message = messageOf(err)
  return (
    /\b429\b/.test(message) ||
    /RESOURCE_EXHAUSTED/i.test(message) ||
    /quota exceeded/i.test(message) ||
    /rate[- ]?limits?/i.test(message)
  )
}

/** Quota (429) or temporary model overload (503). Safe to retry once. */
export function isRetryableAiError(err: unknown): boolean {
  return isRateLimitError(err) || isModelBusyError(err)
}

/** Hide raw provider JSON. Overload and quota both become the localized busy message. */
export function publicAiErrorMessage(
  err: unknown,
  fallback: string,
  busyMessage: string,
): string {
  if (isRetryableAiError(err)) return busyMessage
  if (err instanceof Error && err.message.trim()) return err.message
  return fallback
}
