import type { MLCEngine } from '@mlc-ai/web-llm'
import { completeText } from '@/lib/llm/engine'
import { buildTranslationSystemPrompt } from '@/lib/llm/promptLocale'
import { joinCharacterList, splitCharacterList } from '@/lib/characterFields'
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

async function translateCharacterListField(
  engine: MLCEngine,
  text: string | undefined,
  targetLanguage: Language,
  context: string,
): Promise<string | undefined> {
  if (!text?.trim()) return text
  const items = splitCharacterList(text)
  if (items.length === 0) return text
  const translated = await Promise.all(
    items.map((item, index) =>
      translateText(
        engine,
        item,
        targetLanguage,
        items.length > 1 ? `${context} (${index + 1}/${items.length})` : context,
      ),
    ),
  )
  return joinCharacterList(translated)
}

export interface DuplicateProgress {
  step: string
  current: number
  total: number
}

export interface TranslatedStoryContent {
  title: string
  prompt: string
  language: Language
  storyBeginning: string
  storyEnding: string
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
    sourceId: string
    content: string
    source: 'ai' | 'user'
    sourceChapterId: string | null
  }[]
}

async function translateCharacterFields(
  engine: MLCEngine,
  char: Character,
  targetLanguage: Language,
): Promise<Omit<Character, 'id' | 'storyId'>> {
  const characterLabel = char.name
  let nickname = char.nickname
  if (char.nickname?.trim()) {
    nickname = await translateCharacterListField(
      engine,
      char.nickname,
      targetLanguage,
      `Nickname for character ${characterLabel}`,
    )
  }
  let superpowerDescription = char.superpowerDescription
  if (char.hasSuperpowers && char.superpowerDescription?.trim()) {
    superpowerDescription = await translateCharacterListField(
      engine,
      char.superpowerDescription,
      targetLanguage,
      `Superpower description for character ${characterLabel}`,
    )
  }
  let petSuperpowerDescription = char.petSuperpowerDescription
  if (char.petHasSuperpowers && char.petSuperpowerDescription?.trim()) {
    petSuperpowerDescription = await translateCharacterListField(
      engine,
      char.petSuperpowerDescription,
      targetLanguage,
      `Pet superpower description for character ${characterLabel}`,
    )
  }
  let petSpecies = char.petSpecies
  if (char.hasPet && char.petSpecies?.trim()) {
    petSpecies = await translateCharacterListField(
      engine,
      char.petSpecies,
      targetLanguage,
      `Pet species for character ${characterLabel}`,
    )
  }
  let species = char.species
  if (!(char.isHuman ?? true) && char.species?.trim()) {
    species = await translateCharacterListField(
      engine,
      char.species,
      targetLanguage,
      `Species for character ${characterLabel}`,
    )
  }
  let petName = char.petName
  if (char.hasPet && char.petName?.trim()) {
    petName = await translateCharacterListField(
      engine,
      char.petName,
      targetLanguage,
      `Pet name for character ${characterLabel}`,
    )
  }
  let vehicleType = char.vehicleType
  if (char.hasVehicle && char.vehicleType?.trim()) {
    vehicleType = await translateCharacterListField(
      engine,
      char.vehicleType,
      targetLanguage,
      `Vehicle type for character ${characterLabel}`,
    )
  }
  let vehicleColor = char.vehicleColor
  if (char.hasVehicle && char.vehicleColor?.trim()) {
    vehicleColor = await translateCharacterListField(
      engine,
      char.vehicleColor,
      targetLanguage,
      `Vehicle color for character ${characterLabel}`,
    )
  }
  let vehicleSpeed = char.vehicleSpeed
  if (char.hasVehicle && char.vehicleSpeed?.trim()) {
    vehicleSpeed = await translateCharacterListField(
      engine,
      char.vehicleSpeed,
      targetLanguage,
      `Vehicle speed for character ${characterLabel}`,
    )
  }
  return {
    name: char.name,
    nickname,
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
  }
}

function copyCharacterFields(char: Character): Omit<Character, 'id' | 'storyId'> {
  return {
    name: char.name,
    nickname: char.nickname,
    alignment: char.alignment,
    gender: char.gender,
    age: char.age,
    isHuman: char.isHuman ?? true,
    species: char.species,
    hasSuperpowers: char.hasSuperpowers,
    superpowerDescription: char.superpowerDescription,
    hasPet: char.hasPet ?? false,
    petName: char.petName,
    petSpecies: char.petSpecies,
    petHasSuperpowers: char.petHasSuperpowers ?? false,
    petSuperpowerDescription: char.petSuperpowerDescription,
    hasVehicle: char.hasVehicle ?? false,
    vehicleType: char.vehicleType,
    vehicleColor: char.vehicleColor,
    vehicleSpeed: char.vehicleSpeed,
  }
}

export async function translateStoryContent(
  engine: MLCEngine,
  source: StoryWithDetails,
  targetLanguage: Language,
  onProgress?: (progress: DuplicateProgress) => void,
): Promise<TranslatedStoryContent> {
  const sortedChapters = [...source.chapters].sort((a, b) => a.order - b.order)
  const totalSteps =
    2 + source.characters.length + sortedChapters.length + source.paragraphs.length
  let step = 0

  const report = (message: string) => {
    step += 1
    onProgress?.({ step: message, current: step, total: totalSteps })
  }

  const title =
    source.title === untitledStoryTitle(source.language)
      ? untitledStoryTitle(targetLanguage)
      : await translateText(engine, source.title, targetLanguage, 'Story title')
  report('Translating title…')

  const prompt = await translateText(engine, source.prompt, targetLanguage, 'Story prompt')
  report('Translating prompt…')

  const characters: Omit<Character, 'id' | 'storyId'>[] = []
  for (const char of source.characters) {
    characters.push(await translateCharacterFields(engine, char, targetLanguage))
    report(`Translating character ${char.name}…`)
  }

  const chapters: TranslatedStoryContent['chapters'] = []
  for (const chapter of sortedChapters) {
    const chapterTitle = await translateText(
      engine,
      chapter.title,
      targetLanguage,
      'Chapter title',
    )
    const brief = await translateText(engine, chapter.brief, targetLanguage, 'Chapter brief')
    chapters.push({
      sourceId: chapter.id,
      title: chapterTitle.trim() || chapter.title,
      brief,
      order: chapter.order,
      targetWordCount: chapter.targetWordCount,
      isFinale: chapter.isFinale,
    })
    report(`Translating chapter ${chapter.order + 1}…`)
  }

  const paragraphs: TranslatedStoryContent['paragraphs'] = []
  for (const paragraph of source.paragraphs) {
    const content = await translateText(
      engine,
      paragraph.content,
      targetLanguage,
      'Story paragraph',
    )
    paragraphs.push({
      sourceId: paragraph.id,
      content,
      source: paragraph.source,
      sourceChapterId: paragraph.chapterId,
    })
    report(`Translating paragraph ${paragraphs.length}…`)
  }

  const storyBeginning = source.storyBeginning.trim()
    ? await translateText(engine, source.storyBeginning, targetLanguage, 'Story beginning')
    : source.storyBeginning
  const storyEnding = source.storyEnding.trim()
    ? await translateText(engine, source.storyEnding, targetLanguage, 'Story ending')
    : source.storyEnding

  return {
    title: title.trim() || untitledStoryTitle(targetLanguage),
    prompt,
    language: targetLanguage,
    storyBeginning,
    storyEnding,
    characters,
    chapters,
    paragraphs,
  }
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

  if (!sameLanguage) {
    const translated = await translateStoryContent(engine, source, targetLanguage, onProgress)
    return {
      title: translated.title,
      prompt: translated.prompt,
      language: translated.language,
      genre: source.genre,
      folderId: source.folderId,
      creationMode: source.creationMode,
      plannedChapterCount: source.plannedChapterCount,
      storyBeginning: translated.storyBeginning,
      storyEnding: translated.storyEnding,
      chapterWordTarget: source.chapterWordTarget,
      readerAge: source.readerAge,
      finishPercent: source.finishPercent,
      isBookFinished: false,
      characters: translated.characters,
      chapters: translated.chapters,
      paragraphs: translated.paragraphs.map(({ sourceChapterId, content, source: paragraphSource }) => ({
        content,
        source: paragraphSource,
        sourceChapterId,
      })),
    }
  }

  const title = `${source.title} (copy)`
  report('Copying title…')

  const prompt = source.prompt
  report('Copying prompt…')

  const characters: Omit<Character, 'id' | 'storyId'>[] = []
  for (const char of source.characters) {
    characters.push(copyCharacterFields(char))
    report(`Copying character ${char.name}…`)
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
    chapters.push({
      sourceId: chapter.id,
      title: chapter.title,
      brief: chapter.brief,
      order: chapter.order,
      targetWordCount: chapter.targetWordCount,
      isFinale: chapter.isFinale,
    })
    report(`Copying chapter ${chapter.order + 1}…`)
  }

  const paragraphs: { content: string; source: 'ai' | 'user'; sourceChapterId: string | null }[] =
    []
  for (const paragraph of source.paragraphs) {
    paragraphs.push({
      content: paragraph.content,
      source: paragraph.source,
      sourceChapterId: paragraph.chapterId,
    })
    report(`Copying paragraph ${paragraphs.length}…`)
  }

  return {
    title: title.trim() || untitledStoryTitle(targetLanguage),
    prompt,
    language: targetLanguage,
    genre: source.genre,
    folderId: source.folderId,
    creationMode: source.creationMode,
    plannedChapterCount: source.plannedChapterCount,
    storyBeginning: source.storyBeginning,
    storyEnding: source.storyEnding,
    chapterWordTarget: source.chapterWordTarget,
    readerAge: source.readerAge,
    finishPercent: source.finishPercent,
    isBookFinished: false,
    characters,
    chapters,
    paragraphs,
  }
}
