import type { MLCEngine } from '@mlc-ai/web-llm'
import { buildMlcAppConfig } from '@/lib/models/mlcAppConfig'
import { PRIMARY_MODEL_ID, type Language } from '@/types/story'
import { buildAntiRefusalReminder } from '@/lib/llm/promptLocale'
import { looksLikeRefusal, stripRefusal } from '@/lib/llm/refusal'
import type { ChatEngine, LoadProgress, ModelTier } from '@/lib/llm/chatTypes'
import { createOpenAIEngine, isOpenAIConfigured } from '@/lib/llm/openaiEngine'

export type { ChatEngine, LoadProgress, ModelTier, LlmBackend } from '@/lib/llm/chatTypes'

let engineInstance: ChatEngine | null = null
let initPromise: Promise<ChatEngine> | null = null

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
  if (isOpenAIConfigured()) {
    return 'gpt-4o-mini'
  }
  return PRIMARY_MODEL_ID
}

function wrapWebLLMEngine(mlc: MLCEngine, modelId: string): ChatEngine {
  return {
    backend: 'webllm',
    modelId,
    async interruptGenerate() {
      try {
        await mlc.interruptGenerate()
      } catch {
        /* ignore */
      }
    },
    async completeText(systemPrompt, userPrompt, maxTokens = 1024, temperature = 0.3) {
      const response = await mlc.chat.completions.create({
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
    },
    async streamCompletion(
      systemPrompt,
      userPrompt,
      onToken,
      signal,
      temperature = 0.8,
      maxTokens = 512,
    ) {
      if (signal?.aborted) {
        await mlc.interruptGenerate()
        throw new DOMException('Generation aborted', 'AbortError')
      }

      const chunks = await mlc.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: true,
        stream_options: { include_usage: false },
      })

      const onAbort = () => {
        void mlc.interruptGenerate()
      }
      if (signal) {
        if (signal.aborted) onAbort()
        else signal.addEventListener('abort', onAbort, { once: true })
      }

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
            await mlc.interruptGenerate()
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
        if (abortRace) return await Promise.race([consumeStream(), abortRace])
        return await consumeStream()
      } finally {
        signal?.removeEventListener('abort', onAbort)
      }
    },
  }
}

async function initWebLLMEngine(
  onProgress?: (report: LoadProgress) => void,
): Promise<ChatEngine> {
  const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
  const modelId = PRIMARY_MODEL_ID
  const appConfig = buildMlcAppConfig()
  const engineOptions = {
    initProgressCallback: (report: { progress: number; text: string }) => {
      onProgress?.(report)
    },
  }

  let mlc: MLCEngine
  try {
    mlc = await CreateMLCEngine(modelId, {
      ...engineOptions,
      ...(appConfig ? { appConfig } : {}),
    })
  } catch (localError) {
    if (!appConfig) throw localError
    console.warn(
      '[mlc] Local text weights missing under /models/mlc/ — falling back to default CDN.',
      localError,
    )
    mlc = await CreateMLCEngine(modelId, engineOptions)
  }

  return wrapWebLLMEngine(mlc, modelId)
}

export async function initEngine(
  onProgress?: (report: LoadProgress) => void,
): Promise<{
  engine: ChatEngine
  modelId: string
  tier: ModelTier
  hasWebGPU: boolean
  backend: ChatEngine['backend']
}> {
  if (engineInstance) {
    const hasWebGPU = await detectWebGPU()
    return {
      engine: engineInstance,
      modelId: engineInstance.modelId,
      tier: 'primary',
      hasWebGPU,
      backend: engineInstance.backend,
    }
  }

  if (initPromise) {
    const engine = await initPromise
    const hasWebGPU = await detectWebGPU()
    return {
      engine,
      modelId: engine.modelId,
      tier: 'primary',
      hasWebGPU,
      backend: engine.backend,
    }
  }

  initPromise = (async () => {
    if (isOpenAIConfigured()) {
      onProgress?.({ progress: 0.5, text: 'Connecting to OpenAI…' })
      const engine = createOpenAIEngine()
      onProgress?.({ progress: 1, text: `Ready (${engine.modelId})` })
      engineInstance = engine
      return engine
    }

    const engine = await initWebLLMEngine(onProgress)
    engineInstance = engine
    return engine
  })()

  try {
    const engine = await initPromise
    const hasWebGPU = await detectWebGPU()
    return {
      engine,
      modelId: engine.modelId,
      tier: 'primary',
      hasWebGPU,
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

/**
 * Streams a story chunk while guarding against spurious model refusals.
 * Retries matter most for tiny local models; OpenAI rarely needs them.
 */
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
  const maxAttempts = Math.max(
    1,
    options.maxAttempts ?? (engine.backend === 'openai' ? 2 : 3),
  )
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
