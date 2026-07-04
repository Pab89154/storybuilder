import { useCallback, useEffect, useRef } from 'react'
import { initEngine } from '@/lib/llm/engine'
import { useLLMStore } from '@/store/storyStore'

export function useLLM() {
  const { status, modelId, tier, hasWebGPU, progress, error, setLoading, setReady, setError } =
    useLLMStore()
  const initStarted = useRef(false)

  const loadModel = useCallback(async () => {
    if (status === 'ready' || status === 'loading') return
    setLoading(null)
    try {
      const result = await initEngine((report) => {
        setLoading(report)
      })
      setReady(result.modelId, result.tier, result.hasWebGPU)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load model'
      setError(message)
    }
  }, [status, setLoading, setReady, setError])

  useEffect(() => {
    if (initStarted.current) return
    initStarted.current = true
    void loadModel().finally(() => {
      if (useLLMStore.getState().status === 'error') {
        initStarted.current = false
      }
    })
  }, [loadModel])

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
