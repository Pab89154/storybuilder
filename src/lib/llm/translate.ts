import type { MLCEngine } from '@mlc-ai/web-llm'
import { completeText } from '@/lib/llm/engine'
import { buildTranslationSystemPrompt } from '@/lib/llm/promptLocale'
import { LANGUAGE_ENGLISH_NAMES, untitledStoryTitle } from '@/lib/storyLanguageMeta'
import type { Character, Language, StoryWithDetails } from '@/types/story'

async function translateText(
  engine: MLCEngine,
  text: string,
  targetLanguage: Language,
  context?: string,
): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const userPrompt = context
    ? `Context: ${context}\n\nTranslate this text to ${LANGUAGE_ENGLISH_NAMES[targetLanguage]}:\n\n${trimmed}`
    : `Translate this text to ${LANGUAGE_ENGLISH_NAMES[targetLanguage]}:\n\n${trimmed}`

  return completeText(engine, buildTranslationSystemPrompt(targetLanguage), userPrompt, 1024)
}

export interface DuplicateProgress {
  step: string
  current: number
  total: number
}

export async function duplicateStoryWithTranslation(
  engine: MLCEngine,
  source: StoryWithDetails,
  targetLanguage: Language,
  onProgress?: (progress: DuplicateProgress) => void,
): Promise<{
  title: string
  prompt: string
  language: Language
  genre: string
  folderId: string | null
  creationMode: StoryWithDetails['creationMode']
  plannedChapterCount: number
  storyBeginning: string
  storyEnding: string
  chapterWordTarget: number
  readerAge: number
  finishPercent: number
  isBookFinished: boolean
  characters: Omit<Character, 'id' | 'storyId'>[]
  chapters: {
    sourceId: string
    title: string
    brief: string
    order: number
    targetWordCount: number
    isFinale: boolean
  }[]
  paragraphs: {
    content: string
    source: 'ai' | 'user'
    sourceChapterId: string | null
  }[]
}> {
  const sameLanguage = source.language === targetLanguage
  const sortedChapters = [...source.chapters].sort((a, b) => a.order - b.order)
  const totalSteps =
    2 + source.characters.length + sortedChapters.length + source.paragraphs.length
  let step = 0

  const report = (message: string) => {
    step += 1
    onProgress?.({ step: message, current: step, total: totalSteps })
  }

  const title = sameLanguage
    ? `${source.title} (copy)`
    : await translateText(engine, source.title, targetLanguage, 'Story title')
  report(sameLanguage ? 'Copying title…' : 'Translating title…')

  const prompt = sameLanguage
    ? source.prompt
    : await translateText(engine, source.prompt, targetLanguage, 'Story prompt')
  report(sameLanguage ? 'Copying prompt…' : 'Translating prompt…')

  const characters: Omit<Character, 'id' | 'storyId'>[] = []
  for (const char of source.characters) {
    let superpowerDescription = char.superpowerDescription
    if (!sameLanguage && char.hasSuperpowers && char.superpowerDescription?.trim()) {
      superpowerDescription = await translateText(
        engine,
        char.superpowerDescription,
        targetLanguage,
        `Superpower description for character ${char.name}`,
      )
    }
    let petSuperpowerDescription = char.petSuperpowerDescription
    if (!sameLanguage && char.petHasSuperpowers && char.petSuperpowerDescription?.trim()) {
      petSuperpowerDescription = await translateText(
        engine,
        char.petSuperpowerDescription,
        targetLanguage,
        `Pet superpower description for character ${char.name}`,
      )
    }
    let petSpecies = char.petSpecies
    if (!sameLanguage && char.hasPet && char.petSpecies?.trim()) {
      petSpecies = await translateText(
        engine,
        char.petSpecies,
        targetLanguage,
        `Pet species for character ${char.name}`,
      )
    }
    let species = char.species
    if (!sameLanguage && !(char.isHuman ?? true) && char.species?.trim()) {
      species = await translateText(
        engine,
        char.species,
        targetLanguage,
        `Species for character ${char.name}`,
      )
    }
    let petName = char.petName
    if (!sameLanguage && char.hasPet && char.petName?.trim()) {
      petName = await translateText(
        engine,
        char.petName,
        targetLanguage,
        `Pet name for character ${char.name}`,
      )
    }
    let vehicleType = char.vehicleType
    if (!sameLanguage && char.hasVehicle && char.vehicleType?.trim()) {
      vehicleType = await translateText(
        engine,
        char.vehicleType,
        targetLanguage,
        `Vehicle type for character ${char.name}`,
      )
    }
    let vehicleColor = char.vehicleColor
    if (!sameLanguage && char.hasVehicle && char.vehicleColor?.trim()) {
      vehicleColor = await translateText(
        engine,
        char.vehicleColor,
        targetLanguage,
        `Vehicle color for character ${char.name}`,
      )
    }
    let vehicleSpeed = char.vehicleSpeed
    if (!sameLanguage && char.hasVehicle && char.vehicleSpeed?.trim()) {
      vehicleSpeed = await translateText(
        engine,
        char.vehicleSpeed,
        targetLanguage,
        `Vehicle speed for character ${char.name}`,
      )
    }
    characters.push({
      name: char.name,
      alignment: char.alignment,
      gender: char.gender,
      age: char.age,
      isHuman: char.isHuman ?? true,
      species,
      hasSuperpowers: char.hasSuperpowers,
      superpowerDescription,
      hasPet: char.hasPet ?? false,
      petName,
      petSpecies,
      petHasSuperpowers: char.petHasSuperpowers ?? false,
      petSuperpowerDescription,
      hasVehicle: char.hasVehicle ?? false,
      vehicleType,
      vehicleColor,
      vehicleSpeed,
    })
    report(
      sameLanguage
        ? `Copying character ${char.name}…`
        : `Translating character ${char.name}…`,
    )
  }

  const chapters: {
    sourceId: string
    title: string
    brief: string
    order: number
    targetWordCount: number
    isFinale: boolean
  }[] = []
  for (const chapter of sortedChapters) {
    const title = sameLanguage
      ? chapter.title
      : await translateText(engine, chapter.title, targetLanguage, 'Chapter title')
    const brief = sameLanguage
      ? chapter.brief
      : await translateText(engine, chapter.brief, targetLanguage, 'Chapter brief')
    chapters.push({
      sourceId: chapter.id,
      title: title.trim() || chapter.title,
      brief,
      order: chapter.order,
      targetWordCount: chapter.targetWordCount,
      isFinale: chapter.isFinale,
    })
    report(
      sameLanguage
        ? `Copying chapter ${chapter.order + 1}…`
        : `Translating chapter ${chapter.order + 1}…`,
    )
  }

  const paragraphs: { content: string; source: 'ai' | 'user'; sourceChapterId: string | null }[] =
    []
  for (const paragraph of source.paragraphs) {
    const content = sameLanguage
      ? paragraph.content
      : await translateText(
          engine,
          paragraph.content,
          targetLanguage,
          'Story paragraph',
        )
    paragraphs.push({
      content,
      source: paragraph.source,
      sourceChapterId: paragraph.chapterId,
    })
    report(
      sameLanguage
        ? `Copying paragraph ${paragraphs.length}…`
        : `Translating paragraph ${paragraphs.length}…`,
    )
  }

  const storyBeginning = sameLanguage
    ? source.storyBeginning
    : source.storyBeginning.trim()
      ? await translateText(engine, source.storyBeginning, targetLanguage, 'Story beginning')
      : source.storyBeginning
  const storyEnding = sameLanguage
    ? source.storyEnding
    : source.storyEnding.trim()
      ? await translateText(engine, source.storyEnding, targetLanguage, 'Story ending')
      : source.storyEnding

  return {
    title: title.trim() || untitledStoryTitle(targetLanguage),
    prompt,
    language: targetLanguage,
    genre: source.genre,
    folderId: source.folderId,
    creationMode: source.creationMode,
    plannedChapterCount: source.plannedChapterCount,
    storyBeginning,
    storyEnding,
    chapterWordTarget: source.chapterWordTarget,
    readerAge: source.readerAge,
    finishPercent: source.finishPercent,
    isBookFinished: false,
    characters,
    chapters,
    paragraphs,
  }
}
