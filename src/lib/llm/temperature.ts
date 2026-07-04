import type { Language } from '@/types/story'
import { generationTemperature as storyGenerationTemperature } from '@/lib/storyLanguageMeta'

export function generationTemperature(language: Language): number {
  return storyGenerationTemperature(language)
}
