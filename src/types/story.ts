export type Language = 'en' | 'es' | 'zh' | 'ar' | 'fr' | 'de'
export type LanguageFilter = 'all' | Language
export type CharacterAlignment = 'good' | 'bad'
export type CharacterGender = 'boy' | 'girl'
export type ParagraphSource = 'ai' | 'user'

export interface Folder {
  id: string
  name: string
  order: number
  createdAt: number
  updatedAt: number
}

export interface Character {
  id: string
  storyId: string
  name: string
  alignment: CharacterAlignment
  gender: CharacterGender
  age: number
  isHuman: boolean
  species?: string
  hasSuperpowers: boolean
  superpowerDescription?: string
}

export interface Paragraph {
  id: string
  storyId: string
  chapterId: string | null
  order: number
  content: string
  source: ParagraphSource
  createdAt: number
  updatedAt: number
}

export type BookCreationMode = 'legacy' | 'automatic' | 'advanced'

export interface Chapter {
  id: string
  storyId: string
  order: number
  title: string
  brief: string
  targetWordCount: number
  isFinale: boolean
  createdAt: number
  updatedAt: number
}

export interface Story {
  id: string
  title: string
  language: Language
  prompt: string
  genre: string
  folderId: string | null
  sortOrder: number
  bookmarkPageIndex: number | null
  searchText: string
  targetWordCount: number
  creationMode: BookCreationMode
  plannedChapterCount: number
  storyBeginning: string
  storyEnding: string
  chapterWordTarget: number
  /** Target reader age (years) — adjusts vocabulary and complexity. */
  readerAge: number
  finishPercent: number
  isBookFinished: boolean
  createdAt: number
  updatedAt: number
}

export interface StoryWithDetails extends Story {
  characters: Character[]
  chapters: Chapter[]
  paragraphs: Paragraph[]
}

export type GenerationMode = 'generate' | 'continue' | 'regenerate'

export const DEFAULT_TARGET_WORD_COUNT = 1000
export const CHUNK_WORD_TARGET = 175
/** Soft floor for word-count inputs (no minimum chapter length requirement). */
export const MIN_CHAPTER_WORDS_INPUT = 50
export const MAX_CHAPTER_WORDS = 3000
export const DEFAULT_CHAPTER_WORDS = 800
export const DEFAULT_READER_AGE = 7
export const READER_AGE_OPTIONS = [4, 7, 9, 14] as const

export function normalizeReaderAge(readerAge: number | undefined): number {
  if (readerAge === undefined) return DEFAULT_READER_AGE
  if (readerAge === 12) return 14
  if (readerAge === 10) return 9
  if ((READER_AGE_OPTIONS as readonly number[]).includes(readerAge)) return readerAge
  return DEFAULT_READER_AGE
}
export const DEFAULT_PLANNED_CHAPTERS = 3
export const DEFAULT_FINISH_PERCENT = 25
export const MIN_FINISH_PERCENT = 10
export const MAX_FINISH_PERCENT = 50

export function clampChapterWordTarget(value: number): number {
  return Math.min(
    MAX_CHAPTER_WORDS,
    Math.max(MIN_CHAPTER_WORDS_INPUT, Math.round(value)),
  )
}

export function computeFinaleWordTarget(
  previousChapterWordCounts: number[],
  finishPercent: number,
): number {
  if (previousChapterWordCounts.length === 0) return DEFAULT_CHAPTER_WORDS
  const total = previousChapterWordCounts.reduce((sum, count) => sum + count, 0)
  const raw = Math.round((total * finishPercent) / 100)
  return clampChapterWordTarget(raw)
}

export const PRIMARY_MODEL_ID = 'Qwen2.5-3B-Instruct-q4f16_1-MLC'
export const FALLBACK_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'

export const GENRE_SUGGESTIONS = [
  'Adventure',
  'Fantasy',
  'Sci-Fi',
  'Mystery',
  'Comedy',
  'Fairytale',
  'Friendship',
  'Animals',
  'Superheroes',
  'Historical',
] as const

export type FolderFilter = 'all' | 'uncategorized' | string
