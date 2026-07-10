import { useCallback } from 'react'
import { applyStoryTranslation, updateStory } from '@/db/database'
import { initEngine } from '@/lib/llm/engine'
import { translateStoryContent } from '@/lib/llm/translate'
import { untitledStoryTitle } from '@/lib/storyLanguageMeta'
import { useStories } from '@/hooks/useStories'
import { useUiT } from '@/i18n/context'
import { useStoryStore } from '@/store/storyStore'
import type { Language, StoryWithDetails } from '@/types/story'

function storyHasTranslatableContent(story: StoryWithDetails): boolean {
  if (story.prompt.trim()) return true
  if (story.storyBeginning.trim() || story.storyEnding.trim()) return true
  if (story.paragraphs.some((paragraph) => paragraph.content.trim())) return true
  if (story.chapters.some((chapter) => chapter.title.trim() || chapter.brief.trim())) return true
  if (story.title.trim() && story.title !== untitledStoryTitle(story.language)) return true
  return story.characters.some((character) => {
    return Boolean(
      character.nickname?.trim() ||
        character.superpowerDescription?.trim() ||
        character.petSuperpowerDescription?.trim() ||
        character.petSpecies?.trim() ||
        character.species?.trim() ||
        character.petName?.trim() ||
        character.vehicleType?.trim() ||
        character.vehicleColor?.trim() ||
        character.vehicleSpeed?.trim(),
    )
  })
}

export function useStoryLanguage() {
  const t = useUiT()
  const { refreshStories, loadStory } = useStories()
  const { setDuplicating, setGenerationError, setAdvancedChapterBrief } = useStoryStore()

  const changeStoryLanguage = useCallback(
    async (story: StoryWithDetails, targetLanguage: Language) => {
      if (story.language === targetLanguage) return

      setGenerationError(null)

      if (!storyHasTranslatableContent(story)) {
        await updateStory(story.id, {
          language: targetLanguage,
          title:
            story.title === untitledStoryTitle(story.language)
              ? untitledStoryTitle(targetLanguage)
              : story.title,
        })
        await refreshStories()
        await loadStory(story.id, { onlyIfStillActive: true })
        return
      }

      setDuplicating(true, t('errors.loadingModel'))

      try {
        const { engine } = await initEngine()
        setDuplicating(true, t('errors.preparingTranslation'))

        const translated = await translateStoryContent(
          engine,
          story,
          targetLanguage,
          (progress) => setDuplicating(true, progress.step),
        )

        setDuplicating(true, t('errors.savingTranslation'))
        await applyStoryTranslation(story.id, story, translated)
        setAdvancedChapterBrief('')
        await refreshStories()
        await loadStory(story.id, { onlyIfStillActive: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : t('errors.translationFailed')
        setGenerationError(message)
        throw err
      } finally {
        setDuplicating(false, null)
      }
    },
    [loadStory, refreshStories, setAdvancedChapterBrief, setDuplicating, setGenerationError, t],
  )

  return { changeStoryLanguage }
}
