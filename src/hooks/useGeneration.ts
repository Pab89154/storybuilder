import { useCallback } from 'react'
import { initEngine, interruptActiveGeneration } from '@/lib/llm/engine'
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
import { resetBookForRegeneration } from '@/db/database'
import { useStoryStore } from '@/store/storyStore'
import { countParagraphsWords } from '@/lib/wordCount'
import { useStories } from '@/hooks/useStories'
import { useLLM } from '@/hooks/useLLM'
import { useUiT } from '@/i18n/context'
import type { Paragraph } from '@/types/story'

const generationRunRef = { current: 0 }
const generationAbortRef = { current: null as AbortController | null }
const finishBookRequestedRef = { current: false }
const generationCancelledRef = { current: false }
const generationInFlightRef = { current: null as Promise<void> | null }

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

function canContinueRun(runId: number): boolean {
  return generationRunRef.current === runId && !generationCancelledRef.current
}

function invalidateActiveGenerationRun() {
  generationRunRef.current += 1
}

async function awaitEngineIdle() {
  await interruptActiveGeneration()
}

async function awaitPriorGeneration() {
  if (generationInFlightRef.current) {
    await generationInFlightRef.current
  }
  await awaitEngineIdle()
}

function unlockGenerationUi() {
  useStoryStore.setState((state) => ({
    isGenerating: false,
    generatingStoryId: null,
    streamingParagraphId: null,
    streamingContent: '',
    wordCount: state.activeStory
      ? countParagraphsWords(state.activeStory.paragraphs)
      : state.wordCount,
  }))
  generationAbortRef.current = null
}

function bindGenerationAbort(controller: AbortController) {
  controller.signal.addEventListener(
    'abort',
    () => {
      if (!finishBookRequestedRef.current) {
        generationCancelledRef.current = true
        unlockGenerationUi()
      }
    },
    { once: true },
  )
}

function cancelGenerationImmediately() {
  finishBookRequestedRef.current = false
  generationCancelledRef.current = true
  invalidateActiveGenerationRun()
  void interruptActiveGeneration()
  generationAbortRef.current?.abort()
  unlockGenerationUi()
}

function signalGenerationAbort(requestFinish = false) {
  finishBookRequestedRef.current = requestFinish
  if (!requestFinish) {
    generationCancelledRef.current = true
  }
  void interruptActiveGeneration()
  generationAbortRef.current?.abort()
  if (!requestFinish) {
    unlockGenerationUi()
  }
}

/** Module-level controls so every toolbar instance hits the same active run. */
export function cancelActiveGeneration() {
  cancelGenerationImmediately()
}

export function cancelGenerationIfActive() {
  if (useStoryStore.getState().isGenerating) {
    cancelGenerationImmediately()
  }
}

export function requestFinishActiveBook() {
  const story = useStoryStore.getState().activeStory
  if (!story || story.isBookFinished) return
  if (!useStoryStore.getState().isGenerating) return
  signalGenerationAbort(true)
}

type GenerationCallbacks = ReturnType<typeof buildCallbacksForRun>

function buildCallbacksForRun(storyId: string, runId: number, signal?: AbortSignal) {
  const isStale = () =>
    generationCancelledRef.current || generationRunRef.current !== runId

  return {
    onToken: (token: string) => {
      if (isStale()) return
      useStoryStore.getState().appendStreamingToken(token)
    },
    onParagraphStart: (paragraph: Paragraph) => {
      if (isStale()) return
      useStoryStore.getState().upsertParagraph({ ...paragraph, content: '' })
      useStoryStore.getState().setStreaming(paragraph.id, '')
    },
    onParagraphComplete: (paragraph: Paragraph) => {
      if (isStale()) return
      useStoryStore.getState().upsertParagraph(paragraph)
      useStoryStore.getState().setStreaming(null, '')
    },
    onResetStream: (paragraphId: string | null) => {
      if (isStale()) return
      useStoryStore.getState().setStreaming(paragraphId, '')
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

  const ensureEngine = useCallback(async () => {
    const { engine } = await initEngine()
    return engine
  }, [])

  const finishGenerationRun = useCallback(
    async (storyId: string, runId: number) => {
      if (generationRunRef.current !== runId) return

      setGenerating(false, null)
      setStreaming(null, '')
      generationAbortRef.current = null
      generationCancelledRef.current = false
      try {
        await refreshStories()
        if (useStoryStore.getState().activeStoryId === storyId) {
          await loadStory(storyId, { onlyIfStillActive: true })
        }
      } catch {
        /* UI is already unlocked */
      }
    },
    [loadStory, refreshStories, setGenerating, setStreaming],
  )

  const runGeneration = useCallback(
    async (
      action: (callbacks: GenerationCallbacks) => Promise<void>,
      options?: { finishBookOnRequest?: boolean },
    ) => {
      await awaitPriorGeneration()

      const story = useStoryStore.getState().activeStory
      if (!story) return

      if (useStoryStore.getState().isGenerating) {
        const abort = generationAbortRef.current
        if (abort && !abort.signal.aborted) return
        unlockGenerationUi()
      }

      const storyId = story.id
      const runId = ++generationRunRef.current
      finishBookRequestedRef.current = false
      generationCancelledRef.current = false
      setGenerationError(null)
      setGenerating(true, storyId)
      generationAbortRef.current = new AbortController()
      bindGenerationAbort(generationAbortRef.current)
      const callbacks = {
        ...buildCallbacksForRun(storyId, runId, generationAbortRef.current.signal),
        onChunkLimitReached: () => {
          if (!canContinueRun(runId)) return
          setGenerationError(t('errors.chunkLimitReached'))
        },
      }

      let resolveInFlight: (() => void) | undefined
      const inFlight = new Promise<void>((resolve) => {
        resolveInFlight = resolve
      })
      generationInFlightRef.current = inFlight

      try {
        try {
          await action(callbacks)
        } catch (err) {
          if (canContinueRun(runId) && !isAbortError(err)) {
            setGenerationError(err instanceof Error ? err.message : t('errors.generationFailed'))
          }
        }

        if (options?.finishBookOnRequest && finishBookRequestedRef.current && canContinueRun(runId)) {
          finishBookRequestedRef.current = false
          try {
            await interruptActiveGeneration()
            if (!canContinueRun(runId)) {
              return
            }

            generationAbortRef.current = new AbortController()
            bindGenerationAbort(generationAbortRef.current)
            const finishCallbacks = buildCallbacksForRun(
              storyId,
              runId,
              generationAbortRef.current.signal,
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
            } else if (current && current.id === storyId && current.chapters.length === 0) {
              setGenerationError(t('errors.addChapterBeforeFinish'))
            }
          } catch (err) {
            if (canContinueRun(runId) && !isAbortError(err)) {
              setGenerationError(err instanceof Error ? err.message : t('errors.generationFailed'))
            }
          }
        }
      } finally {
        resolveInFlight?.()
        if (generationInFlightRef.current === inFlight) {
          generationInFlightRef.current = null
        }
        await finishGenerationRun(storyId, runId)
      }
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
    if (!story || story.isBookFinished) return

    if (useStoryStore.getState().isGenerating) {
      const abort = generationAbortRef.current
      if (abort && !abort.signal.aborted) {
        signalGenerationAbort(true)
        return
      }
      unlockGenerationUi()
    }

    if (story.chapters.length === 0) {
      setGenerationError(t('errors.addChapterBeforeFinish'))
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
      await awaitPriorGeneration()

      const story = useStoryStore.getState().activeStory
      if (!story) return

      if (useStoryStore.getState().isGenerating) {
        const abort = generationAbortRef.current
        if (abort && !abort.signal.aborted) return
        unlockGenerationUi()
      }

      const storyId = story.id
      const runId = ++generationRunRef.current
      generationCancelledRef.current = false
      setGenerationError(null)
      setGenerating(true, storyId)
      generationAbortRef.current = new AbortController()
      bindGenerationAbort(generationAbortRef.current)
      const callbacks = buildCallbacksForRun(storyId, runId, generationAbortRef.current.signal)

      let resolveInFlight: (() => void) | undefined
      const inFlight = new Promise<void>((resolve) => {
        resolveInFlight = resolve
      })
      generationInFlightRef.current = inFlight

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
        if (!canContinueRun(runId)) return
        if (!isAbortError(err)) {
          setGenerationError(err instanceof Error ? err.message : t('errors.regenerateFailed'))
        }
      } finally {
        resolveInFlight?.()
        if (generationInFlightRef.current === inFlight) {
          generationInFlightRef.current = null
        }
        await finishGenerationRun(storyId, runId)
      }
    },
    [ensureEngine, finishGenerationRun, setGenerating, setGenerationError, t],
  )

  const regenerateBook = useCallback(async () => {
    const story = useStoryStore.getState().activeStory
    if (!story || useStoryStore.getState().isGenerating) return
    if (story.paragraphs.length === 0 && !story.isBookFinished) return

    const storyId = story.id
    const isAutomatic = story.creationMode === 'automatic'
    const isAdvanced = story.creationMode === 'advanced'

    if (story.creationMode === 'legacy' && !story.prompt.trim()) {
      setGenerationError(t('errors.promptRequired'))
      return
    }

    try {
      await resetBookForRegeneration(storyId, { clearChapters: isAutomatic })
      const {
        updateActiveParagraphs,
        updateActiveChapters,
        updateActiveStoryMeta,
      } = useStoryStore.getState()
      updateActiveParagraphs([])
      updateActiveStoryMeta({ isBookFinished: false, bookmarkPageIndex: null })
      if (isAutomatic) {
        updateActiveChapters([])
      }
      await refreshStories()
      await loadStory(storyId, { onlyIfStillActive: true })

      if (isAutomatic) {
        await generateAutomatic()
      } else if (isAdvanced) {
        await continueAdvanced()
      } else {
        await generate()
      }
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : t('errors.generationFailed'))
    }
  }, [
    continueAdvanced,
    generate,
    generateAutomatic,
    loadStory,
    refreshStories,
    setGenerationError,
    t,
  ])

  const cancel = useCallback(() => {
    cancelActiveGeneration()
  }, [])

  const requestFinishBook = useCallback(() => {
    const story = useStoryStore.getState().activeStory
    if (!story || story.isBookFinished) return
    if (!useStoryStore.getState().isGenerating) {
      void finishBook()
      return
    }
    signalGenerationAbort(true)
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
    regenerateBook,
    cancel,
  }
}
