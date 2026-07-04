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

export function useGeneration() {
  const { isReady, isLoading } = useLLM()
  const t = useUiT()
  const {
    activeStory,
    isGenerating,
    setGenerating,
    setStreaming,
    appendStreamingToken,
    setGenerationError,
    upsertParagraph,
  } = useStoryStore()
  const { loadStory, refreshStories } = useStories()
  const abortRef = useRef<AbortController | null>(null)

  const buildCallbacks = useCallback(
    () => ({
      onToken: (token: string) => {
        appendStreamingToken(token)
      },
      onParagraphStart: (paragraph: Paragraph) => {
        upsertParagraph({ ...paragraph, content: '' })
        setStreaming(paragraph.id, '')
      },
      onParagraphComplete: (paragraph: Paragraph) => {
        upsertParagraph(paragraph)
        setStreaming(null, '')
      },
      onProgress: (_words: number, target: number) => {
        void target
      },
      signal: abortRef.current?.signal,
    }),
    [appendStreamingToken, setStreaming, upsertParagraph],
  )

  const ensureEngine = useCallback(async () => {
    const { engine } = await initEngine()
    return engine
  }, [])

  const runGeneration = useCallback(
    async (action: () => Promise<void>) => {
      if (!activeStory || isGenerating) return
      setGenerationError(null)
      setGenerating(true)
      abortRef.current = new AbortController()

      try {
        await action()
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Sync DB after cancel (may have removed empty partial paragraphs).
        } else {
          setGenerationError(err instanceof Error ? err.message : t('errors.generationFailed'))
        }
      } finally {
        if (activeStory) {
          await loadStory(activeStory.id)
          await refreshStories()
        }
        setGenerating(false)
        setStreaming(null, '')
        abortRef.current = null
      }
    },
    [
      activeStory,
      isGenerating,
      loadStory,
      refreshStories,
      setGenerating,
      setGenerationError,
      setStreaming,
      t,
    ],
  )

  const generate = useCallback(async () => {
    if (!activeStory || isGenerating) return
    if (!activeStory.prompt.trim()) {
      setGenerationError(t('errors.promptRequired'))
      return
    }

    await runGeneration(async () => {
      const engine = await ensureEngine()
      await generateStoryFromScratch(
        engine,
        activeStory,
        activeStory.characters,
        buildCallbacks(),
      )
    })
  }, [activeStory, isGenerating, buildCallbacks, ensureEngine, runGeneration, setGenerationError, t])

  const generateAutomatic = useCallback(async () => {
    if (!activeStory || isGenerating) return
    if (activeStory.plannedChapterCount < 2) {
      setGenerationError(t('errors.minChapters'))
      return
    }

    await runGeneration(async () => {
      const engine = await ensureEngine()
      await generateOrContinueAutomaticBook(
        engine,
        activeStory,
        activeStory.characters,
        activeStory.chapters,
        activeStory.paragraphs,
        buildCallbacks(),
      )
    })
  }, [activeStory, isGenerating, buildCallbacks, ensureEngine, runGeneration, setGenerationError, t])

  const continueAdvanced = useCallback(async () => {
    if (!activeStory || isGenerating) return
    if (activeStory.chapters.length === 0) {
      setGenerationError(t('errors.noChaptersToContinue'))
      return
    }

    await runGeneration(async () => {
      const engine = await ensureEngine()
      await continueAdvancedBook(
        engine,
        activeStory,
        activeStory.characters,
        activeStory.chapters,
        activeStory.paragraphs,
        buildCallbacks(),
      )
    })
  }, [activeStory, isGenerating, buildCallbacks, ensureEngine, runGeneration, setGenerationError, t])

  const addAdvancedChapter = useCallback(
    async (chapterBrief: string) => {
      if (!activeStory || isGenerating) return
      if (activeStory.isBookFinished) {
        setGenerationError(t('errors.bookAlreadyFinished'))
        return
      }

      await runGeneration(async () => {
        const engine = await ensureEngine()
        await generateAdvancedChapter(
          engine,
          activeStory,
          activeStory.characters,
          activeStory.chapters,
          activeStory.paragraphs,
          chapterBrief,
          buildCallbacks(),
        )
      })
    },
    [activeStory, isGenerating, buildCallbacks, ensureEngine, runGeneration, setGenerationError, t],
  )

  const finishBook = useCallback(async () => {
    if (!activeStory || isGenerating) return
    if (activeStory.chapters.length === 0) {
      setGenerationError(t('errors.addChapterBeforeFinish'))
      return
    }
    if (activeStory.isBookFinished) {
      setGenerationError(t('errors.bookAlreadyFinished'))
      return
    }

    await runGeneration(async () => {
      const engine = await ensureEngine()
      await finishAdvancedBook(
        engine,
        activeStory,
        activeStory.characters,
        activeStory.chapters,
        activeStory.paragraphs,
        buildCallbacks(),
      )
    })
  }, [activeStory, isGenerating, buildCallbacks, ensureEngine, runGeneration, setGenerationError, t])

  const continueStoryAction = useCallback(async () => {
    if (!activeStory || isGenerating || activeStory.paragraphs.length === 0) return

    await runGeneration(async () => {
      const engine = await ensureEngine()
      await continueStory(
        engine,
        activeStory,
        activeStory.characters,
        activeStory.paragraphs,
        buildCallbacks(),
      )
    })
  }, [activeStory, isGenerating, buildCallbacks, ensureEngine, runGeneration])

  const regenerate = useCallback(
    async (paragraphId: string) => {
      if (!activeStory || isGenerating) return

      setGenerationError(null)
      setGenerating(true)
      abortRef.current = new AbortController()

      try {
        const engine = await ensureEngine()
        await regenerateParagraph(
          engine,
          activeStory,
          activeStory.characters,
          activeStory.paragraphs,
          paragraphId,
          buildCallbacks(),
        )
        await loadStory(activeStory.id)
        await refreshStories()
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // handled in finally
        } else {
          setGenerationError(err instanceof Error ? err.message : t('errors.regenerateFailed'))
        }
      } finally {
        if (activeStory) {
          await loadStory(activeStory.id)
        }
        setGenerating(false)
        setStreaming(null, '')
        abortRef.current = null
      }
    },
    [
      activeStory,
      isGenerating,
      buildCallbacks,
      ensureEngine,
      loadStory,
      refreshStories,
      setGenerating,
      setGenerationError,
      setStreaming,
      t,
    ],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setGenerating(false)
    setStreaming(null, '')
  }, [setGenerating, setStreaming])

  return {
    isReady,
    isLoading,
    isGenerating,
    generate,
    generateAutomatic,
    continueAdvanced,
    addAdvancedChapter,
    finishBook,
    continueStory: continueStoryAction,
    regenerate,
    cancel,
  }
}
