import { useCallback, useRef } from 'react'
import { initEngine } from '@/lib/llm/engine'
import {
  continueStory,
  generateStoryFromScratch,
  regenerateParagraph,
} from '@/lib/llm/generation'
import {
  finishAdvancedBook,
  generateAdvancedChapter,
  generateOrContinueAutomaticBook,
  continueAdvancedBook,
} from '@/lib/llm/chapterGeneration'
import { useStoryStore } from '@/store/storyStore'
import { useStories } from '@/hooks/useStories'
import { useLLM } from '@/hooks/useLLM'
import { useUiT } from '@/i18n/context'
import type { Paragraph } from '@/types/story'

const generationRunRef = { current: 0 }

type GenerationCallbacks = ReturnType<typeof buildCallbacksForRun>

function buildCallbacksForRun(storyId: string, runId: number, signal?: AbortSignal) {
  return {
    onToken: (token: string) => {
      if (generationRunRef.current !== runId) return
      useStoryStore.getState().appendStreamingToken(token)
    },
    onParagraphStart: (paragraph: Paragraph) => {
      if (generationRunRef.current !== runId) return
      useStoryStore.getState().upsertParagraph({ ...paragraph, content: '' })
      useStoryStore.getState().setStreaming(paragraph.id, '')
    },
    onParagraphComplete: (paragraph: Paragraph) => {
      if (generationRunRef.current !== runId) return
      useStoryStore.getState().upsertParagraph(paragraph)
      useStoryStore.getState().setStreaming(null, '')
    },
    onProgress: (_words: number, target: number) => {
      void target
      void storyId
    },
    signal,
  }
}

export function useGeneration() {
  const { isReady, isLoading } = useLLM()
  const t = useUiT()
  const isGenerating = useStoryStore((state) => state.isGenerating)
  const { setGenerating, setStreaming, setGenerationError } = useStoryStore()
  const { loadStory, refreshStories } = useStories()
  const abortRef = useRef<AbortController | null>(null)
  const finishBookRequestedRef = useRef(false)

  const ensureEngine = useCallback(async () => {
    const { engine } = await initEngine()
    return engine
  }, [])

  const finishGenerationRun = useCallback(
    async (storyId: string, runId: number) => {
      if (generationRunRef.current !== runId) return
      await refreshStories()
      if (useStoryStore.getState().activeStoryId === storyId) {
        await loadStory(storyId, { onlyIfStillActive: true })
      }
      if (generationRunRef.current !== runId) return
      setGenerating(false, null)
      setStreaming(null, '')
      if (generationRunRef.current === runId) {
        abortRef.current = null
      }
    },
    [loadStory, refreshStories, setGenerating, setStreaming],
  )

  const runGeneration = useCallback(
    async (
      action: (callbacks: GenerationCallbacks) => Promise<void>,
      options?: { finishBookOnRequest?: boolean },
    ) => {
      const story = useStoryStore.getState().activeStory
      if (!story || useStoryStore.getState().isGenerating) return

      const storyId = story.id
      const runId = ++generationRunRef.current
      finishBookRequestedRef.current = false
      setGenerationError(null)
      setGenerating(true, storyId)
      abortRef.current = new AbortController()
      const callbacks = buildCallbacksForRun(storyId, runId, abortRef.current.signal)

      try {
        await action(callbacks)
      } catch (err) {
        if (generationRunRef.current !== runId) return
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Sync DB after cancel (may have removed empty partial paragraphs).
        } else {
          setGenerationError(err instanceof Error ? err.message : t('errors.generationFailed'))
        }
      }

      if (
        options?.finishBookOnRequest &&
        finishBookRequestedRef.current &&
        generationRunRef.current === runId
      ) {
        finishBookRequestedRef.current = false
        try {
          abortRef.current = new AbortController()
          const finishCallbacks = buildCallbacksForRun(
            storyId,
            runId,
            abortRef.current.signal,
          )
          const engine = await ensureEngine()
          await loadStory(storyId, { onlyIfStillActive: true })
          const current = useStoryStore.getState().activeStory
          if (
            current &&
            current.id === storyId &&
            !current.isBookFinished &&
            current.chapters.length > 0
          ) {
            await finishAdvancedBook(
              engine,
              current,
              current.characters,
              current.chapters,
              current.paragraphs,
              finishCallbacks,
            )
          }
        } catch (err) {
          if (generationRunRef.current !== runId) return
          if (err instanceof DOMException && err.name === 'AbortError') {
            // User stopped during finale generation.
          } else {
            setGenerationError(err instanceof Error ? err.message : t('errors.generationFailed'))
          }
        }
      }

      await finishGenerationRun(storyId, runId)
    },
    [ensureEngine, finishGenerationRun, loadStory, setGenerating, setGenerationError, t],
  )

  const generate = useCallback(async () => {
    const story = useStoryStore.getState().activeStory
    if (!story || useStoryStore.getState().isGenerating) return
    if (!story.prompt.trim()) {
      setGenerationError(t('errors.promptRequired'))
      return
    }

    await runGeneration(async (callbacks) => {
      const engine = await ensureEngine()
      const current = useStoryStore.getState().activeStory
      if (!current) return
      await generateStoryFromScratch(engine, current, current.characters, callbacks)
    })
  }, [ensureEngine, runGeneration, setGenerationError, t])

  const generateAutomatic = useCallback(async () => {
    const story = useStoryStore.getState().activeStory
    if (!story || useStoryStore.getState().isGenerating) return
    if (story.plannedChapterCount < 2) {
      setGenerationError(t('errors.minChapters'))
      return
    }

    await runGeneration(async (callbacks) => {
      const engine = await ensureEngine()
      const current = useStoryStore.getState().activeStory
      if (!current) return
      await generateOrContinueAutomaticBook(
        engine,
        current,
        current.characters,
        current.chapters,
        current.paragraphs,
        callbacks,
      )
    }, { finishBookOnRequest: true })
  }, [ensureEngine, runGeneration, setGenerationError, t])

  const continueAdvanced = useCallback(async () => {
    const story = useStoryStore.getState().activeStory
    if (!story || useStoryStore.getState().isGenerating) return
    if (story.chapters.length === 0) {
      setGenerationError(t('errors.noChaptersToContinue'))
      return
    }

    await runGeneration(async (callbacks) => {
      const engine = await ensureEngine()
      const current = useStoryStore.getState().activeStory
      if (!current) return
      await continueAdvancedBook(
        engine,
        current,
        current.characters,
        current.chapters,
        current.paragraphs,
        callbacks,
      )
    }, { finishBookOnRequest: true })
  }, [ensureEngine, runGeneration, setGenerationError, t])

  const addAdvancedChapter = useCallback(
    async (chapterBrief: string) => {
      const story = useStoryStore.getState().activeStory
      if (!story || useStoryStore.getState().isGenerating) return
      if (story.isBookFinished) {
        setGenerationError(t('errors.bookAlreadyFinished'))
        return
      }

      await runGeneration(async (callbacks) => {
        const engine = await ensureEngine()
        const current = useStoryStore.getState().activeStory
        if (!current) return
        await generateAdvancedChapter(
          engine,
          current,
          current.characters,
          current.chapters,
          current.paragraphs,
          chapterBrief,
          callbacks,
        )
      }, { finishBookOnRequest: true })
    },
    [ensureEngine, runGeneration, setGenerationError, t],
  )

  const finishBook = useCallback(async () => {
    const story = useStoryStore.getState().activeStory
    if (!story || useStoryStore.getState().isGenerating) return
    if (story.chapters.length === 0) {
      setGenerationError(t('errors.addChapterBeforeFinish'))
      return
    }
    if (story.isBookFinished) {
      setGenerationError(t('errors.bookAlreadyFinished'))
      return
    }

    await runGeneration(async (callbacks) => {
      const engine = await ensureEngine()
      const current = useStoryStore.getState().activeStory
      if (!current) return
      await finishAdvancedBook(
        engine,
        current,
        current.characters,
        current.chapters,
        current.paragraphs,
        callbacks,
      )
    })
  }, [ensureEngine, runGeneration, setGenerationError, t])

  const continueStoryAction = useCallback(async () => {
    const story = useStoryStore.getState().activeStory
    if (!story || useStoryStore.getState().isGenerating || story.paragraphs.length === 0) return

    await runGeneration(async (callbacks) => {
      const engine = await ensureEngine()
      const current = useStoryStore.getState().activeStory
      if (!current) return
      await continueStory(engine, current, current.characters, current.paragraphs, callbacks)
    })
  }, [ensureEngine, runGeneration])

  const regenerate = useCallback(
    async (paragraphId: string) => {
      const story = useStoryStore.getState().activeStory
      if (!story || useStoryStore.getState().isGenerating) return

      const storyId = story.id
      const runId = ++generationRunRef.current
      setGenerationError(null)
      setGenerating(true, storyId)
      abortRef.current = new AbortController()
      const callbacks = buildCallbacksForRun(storyId, runId, abortRef.current.signal)

      try {
        const engine = await ensureEngine()
        await regenerateParagraph(
          engine,
          story,
          story.characters,
          story.paragraphs,
          paragraphId,
          callbacks,
        )
      } catch (err) {
        if (generationRunRef.current !== runId) return
        if (err instanceof DOMException && err.name === 'AbortError') {
          // handled in finally
        } else {
          setGenerationError(err instanceof Error ? err.message : t('errors.regenerateFailed'))
        }
      } finally {
        await finishGenerationRun(storyId, runId)
      }
    },
    [ensureEngine, finishGenerationRun, setGenerating, setGenerationError, t],
  )

  const cancel = useCallback(() => {
    finishBookRequestedRef.current = false
    abortRef.current?.abort()
  }, [])

  const requestFinishBook = useCallback(() => {
    const story = useStoryStore.getState().activeStory
    if (!story || story.isBookFinished) return
    if (!useStoryStore.getState().isGenerating) {
      void finishBook()
      return
    }
    finishBookRequestedRef.current = true
    abortRef.current?.abort()
  }, [finishBook])

  return {
    isReady,
    isLoading,
    isGenerating,
    generate,
    generateAutomatic,
    continueAdvanced,
    addAdvancedChapter,
    finishBook,
    requestFinishBook,
    continueStory: continueStoryAction,
    regenerate,
    cancel,
  }
}
