import type { Language } from '@/types/story'
import { buildAntiRefusalReminder } from '@/lib/llm/promptLocale'
import { looksLikeRefusal, stripRefusal } from '@/lib/llm/refusal'
import type { ChatEngine, LoadProgress } from '@/lib/llm/chatTypes'
import { createOpenAIEngine, isOpenAIConfigured } from '@/lib/llm/openaiEngine'

export type { ChatEngine, LoadProgress, LlmBackend } from '@/lib/llm/chatTypes'
export { isOpenAIConfigured } from '@/lib/llm/openaiEngine'

export const OPENAI_MODEL_ID = 'gpt-4o-mini'

let engineInstance: ChatEngine | null = null
let initPromise: Promise<ChatEngine> | null = null

export function getModelId(): string {
  return OPENAI_MODEL_ID
}

export async function initEngine(
  onProgress?: (report: LoadProgress) => void,
): Promise<{
  engine: ChatEngine
  modelId: string
  backend: ChatEngine['backend']
}> {
  if (engineInstance) {
    return {
      engine: engineInstance,
      modelId: engineInstance.modelId,
      backend: engineInstance.backend,
    }
  }

  if (initPromise) {
    const engine = await initPromise
    return {
      engine,
      modelId: engine.modelId,
      backend: engine.backend,
    }
  }

  initPromise = (async () => {
    if (!isOpenAIConfigured()) {
      throw new Error(
        'Story AI is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and add OPENAI_API_KEY as a Supabase Edge Function secret.',
      )
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error(
        'You are offline. StoryBuilder needs an internet connection to generate stories.',
      )
    }

    onProgress?.({ progress: 0.4, text: 'Connecting to OpenAI…' })
    const engine = createOpenAIEngine()
    onProgress?.({ progress: 1, text: `Ready (${engine.modelId})` })
    engineInstance = engine
    return engine
  })()

  try {
    const engine = await initPromise
    return {
      engine,
      modelId: engine.modelId,
      backend: engine.backend,
    }
  } catch (error) {
    initPromise = null
    engineInstance = null
    throw error
  }
}

export async function interruptActiveGeneration(): Promise<void> {
  if (!engineInstance) return
  try {
    await engineInstance.interruptGenerate()
  } catch {
    /* ignore */
  }
}

export async function completeText(
  engine: ChatEngine,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024,
  temperature = 0.3,
): Promise<string> {
  return engine.completeText(systemPrompt, userPrompt, maxTokens, temperature)
}

export async function streamCompletion(
  engine: ChatEngine,
  systemPrompt: string,
  userPrompt: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
  temperature = 0.8,
): Promise<string> {
  return engine.streamCompletion(systemPrompt, userPrompt, onToken, signal, temperature)
}

export async function streamStoryCompletion(
  engine: ChatEngine,
  systemPrompt: string,
  userPrompt: string,
  options: {
    language: Language
    onToken: (token: string) => void
    onResetStream?: () => void
    signal?: AbortSignal
    temperature?: number
    maxAttempts?: number
  },
): Promise<string> {
  const baseTemperature = options.temperature ?? 0.8
  const maxAttempts = Math.max(1, options.maxAttempts ?? 2)
  let salvaged = ''

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (options.signal?.aborted) break
    if (attempt > 0) options.onResetStream?.()

    const attemptSystemPrompt =
      attempt === 0
        ? systemPrompt
        : `${systemPrompt}\n\n${buildAntiRefusalReminder(options.language)}`
    const attemptTemperature = Math.min(baseTemperature + attempt * 0.15, 1.3)

    const text = await streamCompletion(
      engine,
      attemptSystemPrompt,
      userPrompt,
      options.onToken,
      options.signal,
      attemptTemperature,
    )

    const cleaned = stripRefusal(text)
    if (cleaned && !looksLikeRefusal(cleaned)) {
      return cleaned
    }
    salvaged = cleaned
  }

  return salvaged
}

export async function unloadEngine(): Promise<void> {
  if (engineInstance) {
    await engineInstance.interruptGenerate()
    engineInstance = null
    initPromise = null
  }
}
