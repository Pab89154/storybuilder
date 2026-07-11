import type { InitProgressReport, MLCEngine } from '@mlc-ai/web-llm'
import { buildMlcAppConfig } from '@/lib/models/mlcAppConfig'
import {
  PRIMARY_MODEL_ID,
  type Language,
} from '@/types/story'
import { buildAntiRefusalReminder } from '@/lib/llm/promptLocale'
import { looksLikeRefusal, stripRefusal } from '@/lib/llm/refusal'

export type ModelTier = 'primary' | 'fallback'

let engineInstance: MLCEngine | null = null
let currentModelId: string | null = null
let initPromise: Promise<MLCEngine> | null = null

export async function detectWebGPU(): Promise<boolean> {
  if (!('gpu' in navigator) || !navigator.gpu) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

export function getModelIdForTier(tier: ModelTier): string {
  void tier
  return PRIMARY_MODEL_ID
}

export async function initEngine(
  onProgress?: (report: InitProgressReport) => void,
): Promise<{ engine: MLCEngine; modelId: string; tier: ModelTier; hasWebGPU: boolean }> {
  if (engineInstance && currentModelId) {
    const hasWebGPU = await detectWebGPU()
    return {
      engine: engineInstance,
      modelId: currentModelId,
      tier: 'primary',
      hasWebGPU,
    }
  }

  if (initPromise) {
    const engine = await initPromise
    const hasWebGPU = await detectWebGPU()
    return {
      engine,
      modelId: currentModelId!,
      tier: 'primary',
      hasWebGPU,
    }
  }

  initPromise = (async () => {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
    const modelId = PRIMARY_MODEL_ID

    const appConfig = buildMlcAppConfig()
    const engineOptions = {
      initProgressCallback: (report: InitProgressReport) => {
        onProgress?.(report)
      },
    }

    let engine: MLCEngine
    try {
      engine = await CreateMLCEngine(modelId, {
        ...engineOptions,
        ...(appConfig ? { appConfig } : {}),
      })
    } catch (localError) {
      if (!appConfig) throw localError
      console.warn(
        '[mlc] Local text weights missing under /models/mlc/ — falling back to default CDN.',
        localError,
      )
      engine = await CreateMLCEngine(modelId, engineOptions)
    }

    engineInstance = engine
    currentModelId = modelId
    return engine
  })()

  try {
    const engine = await initPromise
    const hasWebGPU = await detectWebGPU()
    return {
      engine,
      modelId: currentModelId!,
      tier: 'primary',
      hasWebGPU,
    }
  } catch (error) {
    initPromise = null
    engineInstance = null
    currentModelId = null
    throw error
  }
}

export async function interruptActiveGeneration(): Promise<void> {
  if (!engineInstance) return
  try {
    await engineInstance.interruptGenerate()
  } catch {
    /* ignore — engine may already be idle */
  }
}

function bindStreamAbort(engine: MLCEngine, signal?: AbortSignal): (() => void) | undefined {
  if (!signal) return undefined
  const onAbort = () => {
    void engine.interruptGenerate()
  }
  if (signal.aborted) {
    onAbort()
    return undefined
  }
  signal.addEventListener('abort', onAbort, { once: true })
  return () => signal.removeEventListener('abort', onAbort)
}
export async function completeText(
  engine: MLCEngine,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024,
  temperature = 0.3,
): Promise<string> {
  const response = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: false,
  })

  const content = response.choices[0]?.message?.content
  return typeof content === 'string' ? content.trim() : ''
}

export async function streamCompletion(
  engine: MLCEngine,
  systemPrompt: string,
  userPrompt: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
  temperature = 0.8,
): Promise<string> {
  if (signal?.aborted) {
    await engine.interruptGenerate()
    throw new DOMException('Generation aborted', 'AbortError')
  }

  const chunks = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: 512,
    stream: true,
    stream_options: { include_usage: false },
  })

  const unbindAbort = bindStreamAbort(engine, signal)

  const abortRace = signal
    ? signal.aborted
      ? Promise.reject<never>(new DOMException('Generation aborted', 'AbortError'))
      : new Promise<never>((_, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Generation aborted', 'AbortError')),
            { once: true },
          )
        })
    : null

  const consumeStream = async (): Promise<string> => {
    let fullText = ''

    for await (const chunk of chunks) {
      if (signal?.aborted) {
        await engine.interruptGenerate()
        throw new DOMException('Generation aborted', 'AbortError')
      }

      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (delta) {
        fullText += delta
        onToken(delta)
      }
    }

    return fullText.trim()
  }

  try {
    if (abortRace) {
      return await Promise.race([consumeStream(), abortRace])
    }
    return await consumeStream()
  } finally {
    unbindAbort?.()
  }
}

/**
 * Streams a story chunk while guarding against spurious model refusals.
 *
 * Small local models occasionally answer a harmless story prompt with a
 * refusal ("I'm sorry, but I can't…"). When that happens we clear the streamed
 * text, escalate the system prompt with a blunt anti-refusal reminder, nudge
 * the temperature up, and retry. If every attempt still refuses, the best
 * salvageable (refusal-stripped) text is returned so the caller can drop it.
 */
export async function streamStoryCompletion(
  engine: MLCEngine,
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
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3)
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
    await engineInstance.unload()
    engineInstance = null
    currentModelId = null
    initPromise = null
  }
}
