import type { InitProgressReport, MLCEngine } from '@mlc-ai/web-llm'
import { buildMlcAppConfig } from '@/lib/models/mlcAppConfig'
import {
  FALLBACK_MODEL_ID,
  PRIMARY_MODEL_ID,
} from '@/types/story'

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
  return tier === 'primary' ? PRIMARY_MODEL_ID : FALLBACK_MODEL_ID
}

export async function initEngine(
  onProgress?: (report: InitProgressReport) => void,
): Promise<{ engine: MLCEngine; modelId: string; tier: ModelTier; hasWebGPU: boolean }> {
  if (engineInstance && currentModelId) {
    return {
      engine: engineInstance,
      modelId: currentModelId,
      tier: currentModelId === PRIMARY_MODEL_ID ? 'primary' : 'fallback',
      hasWebGPU: currentModelId === PRIMARY_MODEL_ID,
    }
  }

  if (initPromise) {
    const engine = await initPromise
    return {
      engine,
      modelId: currentModelId!,
      tier: currentModelId === PRIMARY_MODEL_ID ? 'primary' : 'fallback',
      hasWebGPU: currentModelId === PRIMARY_MODEL_ID,
    }
  }

  initPromise = (async () => {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
    const hasWebGPU = await detectWebGPU()
    const tier: ModelTier = hasWebGPU ? 'primary' : 'fallback'
    const modelId = getModelIdForTier(tier)

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
    return {
      engine,
      modelId: currentModelId!,
      tier: currentModelId === PRIMARY_MODEL_ID ? 'primary' : 'fallback',
      hasWebGPU: currentModelId === PRIMARY_MODEL_ID,
    }
  } catch (error) {
    initPromise = null
    engineInstance = null
    currentModelId = null
    throw error
  }
}

export async function completeText(
  engine: MLCEngine,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024,
): Promise<string> {
  const response = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
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

export async function unloadEngine(): Promise<void> {
  if (engineInstance) {
    await engineInstance.unload()
    engineInstance = null
    currentModelId = null
    initPromise = null
  }
}
