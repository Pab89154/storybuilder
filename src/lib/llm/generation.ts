import type { MLCEngine } from '@mlc-ai/web-llm'
import {
  addParagraph,
  deleteParagraph,
  getNextParagraphOrder,
  getStoryWithDetails,
  replaceParagraphContent,
  updateStory,
} from '@/db/database'
import { countWords, truncateTitle } from '@/lib/utils'
import {
  finalizeGeneratedParagraph,
  MAX_GENERATION_CHUNKS,
  shouldStopGenerationLoop,
} from '@/lib/llm/chunkLimits'
import { untitledStoryTitle } from '@/lib/storyLanguageMeta'
import {
  buildContinuePrompt,
  buildGenerateChunkPrompt,
  buildRegeneratePrompt,
  buildSystemPrompt,
} from '@/lib/llm/prompts'
import { streamCompletion } from '@/lib/llm/engine'
import { generationTemperature } from '@/lib/llm/temperature'
import {
  CHUNK_WORD_TARGET,
  type Character,
  type Paragraph,
  type Story,
} from '@/types/story'

export interface GenerationCallbacks {
  onToken: (token: string, paragraphId: string | null) => void
  onParagraphStart: (paragraph: Paragraph) => void
  onParagraphComplete: (paragraph: Paragraph) => void
  onProgress: (words: number, target: number) => void
  onChunkLimitReached?: () => void
  signal?: AbortSignal
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

async function persistStreamingParagraph(
  storyId: string,
  order: number,
  content: string,
  source: Paragraph['source'] = 'ai',
  chapterId: string | null = null,
): Promise<Paragraph> {
  return addParagraph(storyId, { content, source, order, chapterId })
}

export async function generateStoryFromScratch(
  engine: MLCEngine,
  story: Story,
  characters: Character[],
  callbacks: GenerationCallbacks,
): Promise<Paragraph[]> {
  const created: Paragraph[] = []
  let wordsSoFar = 0
  let order = await getNextParagraphOrder(story.id)
  let chunkAttempts = 0

  while (wordsSoFar < story.targetWordCount) {
    if (callbacks.signal?.aborted) break
    chunkAttempts += 1

    const userPrompt = buildGenerateChunkPrompt({
      language: story.language,
      storyPrompt: story.prompt,
      characters,
      existingParagraphs: created,
      wordsSoFar,
      targetWordCount: story.targetWordCount,
      chunkWordTarget: CHUNK_WORD_TARGET,
    })

    let streamingContent = ''
    const paragraph = await persistStreamingParagraph(story.id, order, '', 'ai', null)
    callbacks.onParagraphStart(paragraph)

    try {
      const chunkText = await streamCompletion(
        engine,
        buildSystemPrompt(story.language, story.readerAge),
        userPrompt,
        (token) => {
          streamingContent += token
          callbacks.onToken(token, paragraph.id)
        },
        callbacks.signal,
        generationTemperature(story.language),
      )

      const finalContent = chunkText || streamingContent
      const saved = await finalizeGeneratedParagraph(paragraph, finalContent, 'ai')
      if (!saved) {
        if (shouldStopGenerationLoop(wordsSoFar, story.targetWordCount, chunkAttempts, 0)) {
          if (chunkAttempts >= MAX_GENERATION_CHUNKS) callbacks.onChunkLimitReached?.()
          break
        }
        continue
      }
      created.push(saved)
      callbacks.onParagraphComplete(saved)

      const wordsInChunk = countWords(saved.content)
      wordsSoFar += wordsInChunk
      callbacks.onProgress(wordsSoFar, story.targetWordCount)
      order += 1

      if (shouldStopGenerationLoop(wordsSoFar, story.targetWordCount, chunkAttempts, wordsInChunk)) {
        if (chunkAttempts >= MAX_GENERATION_CHUNKS && wordsSoFar < story.targetWordCount) {
          callbacks.onChunkLimitReached?.()
        }
        break
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (streamingContent.trim()) {
          const saved = await finalizeGeneratedParagraph(paragraph, streamingContent, 'ai')
          if (saved) {
            created.push(saved)
            callbacks.onParagraphComplete(saved)
          }
        } else {
          await deleteParagraph(paragraph.id)
        }
        break
      }
      throw err
    }
  }

  if (created.length > 0 && !story.prompt.trim()) {
    await updateStory(story.id, { title: truncateTitle(created[0].content) })
  } else if (story.prompt.trim() && story.title === untitledStoryTitle(story.language)) {
    await updateStory(story.id, { title: truncateTitle(story.prompt) })
  }

  return created
}

export async function continueStory(
  engine: MLCEngine,
  story: Story,
  characters: Character[],
  existingParagraphs: Paragraph[],
  callbacks: GenerationCallbacks,
): Promise<Paragraph> {
  const userPrompt = buildContinuePrompt({
    language: story.language,
    storyPrompt: story.prompt,
    characters,
    existingParagraphs,
    chunkWordTarget: CHUNK_WORD_TARGET,
  })

  const order = await getNextParagraphOrder(story.id)
  let streamingContent = ''
  const paragraph = await persistStreamingParagraph(story.id, order, '', 'ai', null)
  callbacks.onParagraphStart(paragraph)

  try {
    const chunkText = await streamCompletion(
      engine,
      buildSystemPrompt(story.language, story.readerAge),
      userPrompt,
      (token) => {
        streamingContent += token
        callbacks.onToken(token, paragraph.id)
      },
      callbacks.signal,
      generationTemperature(story.language),
    )

    const finalContent = chunkText || streamingContent
    const saved = await finalizeGeneratedParagraph(paragraph, finalContent, 'ai')
    if (!saved) {
      throw new Error('Generation produced empty content')
    }
    callbacks.onParagraphComplete(saved)

    const totalWords =
      existingParagraphs.reduce((sum, p) => sum + countWords(p.content), 0) +
      countWords(saved.content)
    callbacks.onProgress(totalWords, story.targetWordCount)

    return saved
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (streamingContent.trim()) {
        const saved = await finalizeGeneratedParagraph(paragraph, streamingContent, 'ai')
        if (saved) {
          callbacks.onParagraphComplete(saved)
          return saved
        }
      }
      await deleteParagraph(paragraph.id)
    }
    throw err
  }
}

export async function regenerateParagraph(
  engine: MLCEngine,
  story: Story,
  characters: Character[],
  paragraphs: Paragraph[],
  targetParagraphId: string,
  callbacks: GenerationCallbacks,
): Promise<Paragraph> {
  const target = paragraphs.find((p) => p.id === targetParagraphId)
  if (!target) throw new Error('Paragraph not found')

  const userPrompt = buildRegeneratePrompt({
    language: story.language,
    storyPrompt: story.prompt,
    characters,
    paragraphs,
    targetParagraphId,
  })

  let streamingContent = ''
  callbacks.onParagraphStart(target)

  const chunkText = await streamCompletion(
    engine,
    buildSystemPrompt(story.language, story.readerAge),
    userPrompt,
    (token) => {
      streamingContent += token
      callbacks.onToken(token, target.id)
    },
    callbacks.signal,
    generationTemperature(story.language),
  )

  const finalContent = (chunkText || streamingContent).trim()
  if (!finalContent) {
    throw new Error('Regeneration produced empty content')
  }
  await replaceParagraphContent(target.id, finalContent, 'ai')
  const saved = { ...target, content: finalContent, source: 'ai' as const, updatedAt: Date.now() }
  callbacks.onParagraphComplete(saved)

  const totalWords = paragraphs.reduce(
    (sum, p) => sum + countWords(p.id === target.id ? finalContent : p.content),
    0,
  )
  callbacks.onProgress(totalWords, story.targetWordCount)

  return saved
}

export async function refreshStoryDetails(storyId: string) {
  return getStoryWithDetails(storyId)
}

export { splitIntoParagraphs }
