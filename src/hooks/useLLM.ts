import { useCallback, useEffect } from 'react'
import type { InitProgressReport } from '@mlc-ai/web-llm'
import { initEngine } from '@/lib/llm/engine'
import { ensureLLMAutoInit } from '@/lib/llm/llmBootstrap'
import { useLLMStore } from '@/store/storyStore'

let lastProgressUpdateAt = 0

function throttledSetLoading(progress: InitProgressReport | null) {
  const now = Date.now()
  if (progress && now - lastProgressUpdateAt < 500) return
  lastProgressUpdateAt = now
  useLLMStore.getState().setLoading(progress)
}

async function loadModelOnce(): Promise<void> {
  const { status, setLoading, setReady, setError } = useLLMStore.getState()
  if (status === 'ready' || status === 'loading') return

  setLoading(null)
  try {
    const result = await initEngine((report) => {
      throttledSetLoading(report)
    })
    setReady(result.modelId, result.tier, result.hasWebGPU)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load model'
    setError(message)
  }
}

export function useLLM() {
  const { status, modelId, tier, hasWebGPU, progress, error } = useLLMStore()

  const loadModel = useCallback(() => loadModelOnce(), [])

  useEffect(() => {
    ensureLLMAutoInit(loadModelOnce)
  }, [])

  return {
    status,
    modelId,
    tier,
    hasWebGPU,
    progress,
    error,
    loadModel,
    isReady: status === 'ready',
    isLoading: status === 'loading',
  }
}
