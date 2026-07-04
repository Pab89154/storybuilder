import { useCallback } from 'react'
import { getStoryWithDetails, insertStoryFromDuplicate } from '@/db/database'
import { initEngine } from '@/lib/llm/engine'
import { duplicateStoryWithTranslation } from '@/lib/llm/translate'
import { useStories } from '@/hooks/useStories'
import { useUiT } from '@/i18n/context'
import { useStoryStore } from '@/store/storyStore'
import type { Language } from '@/types/story'

export function useDuplicateStory() {
  const t = useUiT()
  const { refreshStories, loadStory } = useStories()
  const { isDuplicating, duplicateProgress, setDuplicating, setGenerationError } = useStoryStore()

  const duplicateAndTranslate = useCallback(
    async (storyId: string, targetLanguage: Language) => {
      const source = await getStoryWithDetails(storyId)
      if (!source) throw new Error(t('errors.storyNotFound'))

      setDuplicating(true, t('errors.loadingModel'))
      setGenerationError(null)

      try {
        const { engine } = await initEngine()
        setDuplicating(true, t('errors.preparingTranslation'))

        const translated = await duplicateStoryWithTranslation(
          engine,
          source,
          targetLanguage,
          (progress) => setDuplicating(true, progress.step),
        )

        setDuplicating(true, t('errors.savingDuplicate'))
        const newStory = await insertStoryFromDuplicate({
          ...translated,
          targetWordCount: source.targetWordCount,
        })

        await refreshStories()
        await loadStory(newStory.id)
        return newStory
      } catch (err) {
        const message = err instanceof Error ? err.message : t('errors.duplicateFailed')
        setGenerationError(message)
        throw err
      } finally {
        setDuplicating(false, null)
      }
    },
    [refreshStories, loadStory, setDuplicating, setGenerationError, t],
  )

  return {
    duplicateAndTranslate,
    isDuplicating,
    duplicateProgress,
  }
}
