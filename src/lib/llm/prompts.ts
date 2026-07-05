import type { Character, Language, Paragraph } from '@/types/story'
import { MAX_USER_PROMPT_TOKENS, truncateToTokenBudget } from '@/lib/llm/contextBudget'
import {
  buildCharacterBible,
  buildChapterGeneratePrompt as buildChapterGeneratePromptLocale,
  buildChapterOutlinePrompt as buildChapterOutlinePromptLocale,
  buildContinuePrompt as buildContinuePromptLocale,
  buildGenerateChunkPrompt as buildGenerateChunkPromptLocale,
  buildRegeneratePrompt as buildRegeneratePromptLocale,
  buildSystemPrompt,
  readerAgeGuidance,
} from '@/lib/llm/promptLocale'

export {
  buildCharacterBible,
  buildSystemPrompt,
  readerAgeGuidance,
}

function buildStoryContext(paragraphs: Paragraph[], language: Language): string {
  if (paragraphs.length === 0) return ''
  const joined = paragraphs.map((p) => p.content.trim()).filter(Boolean).join('\n\n')
  return truncateToTokenBudget(joined, MAX_USER_PROMPT_TOKENS, language)
}

export function buildGenerateChunkPrompt(input: {
  language: Language
  storyPrompt: string
  characters: Character[]
  existingParagraphs: Paragraph[]
  wordsSoFar: number
  targetWordCount: number
  chunkWordTarget: number
}): string {
  return buildGenerateChunkPromptLocale({
    language: input.language,
    storyPrompt: input.storyPrompt,
    bible: buildCharacterBible(input.characters, input.language),
    context: buildStoryContext(input.existingParagraphs, input.language),
    wordsSoFar: input.wordsSoFar,
    targetWordCount: input.targetWordCount,
    chunkWordTarget: input.chunkWordTarget,
  })
}

export function buildContinuePrompt(input: {
  language: Language
  storyPrompt: string
  characters: Character[]
  existingParagraphs: Paragraph[]
  chunkWordTarget: number
}): string {
  return buildContinuePromptLocale({
    language: input.language,
    storyPrompt: input.storyPrompt,
    bible: buildCharacterBible(input.characters, input.language),
    context: buildStoryContext(input.existingParagraphs, input.language),
    chunkWordTarget: input.chunkWordTarget,
  })
}

export function buildRegeneratePrompt(input: {
  language: Language
  storyPrompt: string
  characters: Character[]
  paragraphs: Paragraph[]
  targetParagraphId: string
}): string {
  const targetIndex = input.paragraphs.findIndex((p) => p.id === input.targetParagraphId)
  const before = input.paragraphs.slice(0, targetIndex)
  const after = input.paragraphs.slice(targetIndex + 1)

  return buildRegeneratePromptLocale({
    language: input.language,
    storyPrompt: input.storyPrompt,
    bible: buildCharacterBible(input.characters, input.language),
    beforeText: buildStoryContext(before, input.language),
    afterText: buildStoryContext(after, input.language),
    targetOrder: targetIndex + 1,
  })
}

export interface ParsedChapterOutline {
  title: string
  brief: string
}

export function parseChapterOutline(text: string): ParsedChapterOutline[] {
  const chapters: ParsedChapterOutline[] = []
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines) {
    const match = line.match(/^\d+\.\s*(.+?)\s*\|\s*(.+)$/)
    if (match) {
      chapters.push({ title: match[1].trim(), brief: match[2].trim() })
      continue
    }
    const altMatch = line.match(/^(?:chapter\s*)?\d+\s*[:.)]\s*(.+)$/i)
    if (altMatch) {
      chapters.push({ title: altMatch[1].trim(), brief: '' })
    }
  }

  return chapters
}

export function buildChapterOutlinePrompt(input: {
  language: Language
  storyPrompt: string
  characters: Character[]
  chapterCount: number
  wordsPerChapter: number
}): string {
  return buildChapterOutlinePromptLocale({
    language: input.language,
    storyPrompt: input.storyPrompt,
    bible: buildCharacterBible(input.characters, input.language),
    chapterCount: input.chapterCount,
    wordsPerChapter: input.wordsPerChapter,
  })
}

export function buildChapterGeneratePrompt(input: {
  language: Language
  storyPrompt: string
  characters: Character[]
  chapterTitle: string
  chapterBrief: string
  chapterNumber: number
  totalChapters?: number
  priorChaptersText: string
  currentChapterParagraphs: Paragraph[]
  wordsSoFar: number
  targetWordCount: number
  chunkWordTarget: number
  isFinale?: boolean
}): string {
  const currentContext = buildStoryContext(input.currentChapterParagraphs, input.language)
  const priorChapters = truncateToTokenBudget(
    input.priorChaptersText,
    MAX_USER_PROMPT_TOKENS,
    input.language,
  )
  const chapterLabel =
    input.totalChapters !== undefined
      ? `${input.chapterNumber}/${input.totalChapters}`
      : String(input.chapterNumber)

  return buildChapterGeneratePromptLocale({
    language: input.language,
    storyPrompt: input.storyPrompt,
    bible: buildCharacterBible(input.characters, input.language),
    chapterLabel,
    chapterTitle: input.chapterTitle,
    chapterBrief: input.chapterBrief,
    chapterNumber: input.chapterNumber,
    priorChapters,
    currentContext,
    wordsSoFar: input.wordsSoFar,
    targetWordCount: input.targetWordCount,
    chunkWordTarget: input.chunkWordTarget,
    isFinale: input.isFinale,
  })
}
