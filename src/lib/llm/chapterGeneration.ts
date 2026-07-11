import type { MLCEngine } from '@mlc-ai/web-llm'
import {
  addChapter,
  addParagraph,
  deleteParagraph,
  getNextChapterOrder,
  getNextParagraphOrder,
  replaceChaptersForStory,
  updateStory,
} from '@/db/database'
import { getChapterWordCount, isChapterComplete } from '@/lib/chapterProgress'
import { countWords, generateId, truncateTitle } from '@/lib/utils'
import {
  defaultChapterTitle,
  finaleChapterBrief,
  finaleChapterTitle,
  untitledStoryTitle,
} from '@/lib/storyLanguageMeta'
import { finalizeGeneratedParagraph, MAX_GENERATION_CHUNKS, shouldStopGenerationLoop } from '@/lib/llm/chunkLimits'
import { streamStoryCompletion } from '@/lib/llm/engine'
import { generationTemperature } from '@/lib/llm/temperature'
import { useStoryStore } from '@/store/storyStore'
import {
  buildChapterGeneratePrompt,
  buildChapterOutlinePrompt,
  buildSystemPrompt,
  parseChapterOutline,
} from '@/lib/llm/prompts'
import type { GenerationCallbacks } from '@/lib/llm/generation'
import {
  CHUNK_WORD_TARGET,
  clampChapterWordTarget,
  clampPlannedChapterCount,
  computeFinaleWordTarget,
  type Chapter,
  type Character,
  type Paragraph,
  type Story,
} from '@/types/story'

function buildPriorChaptersText(
  chapters: Chapter[],
  paragraphs: Paragraph[],
  beforeChapterOrder: number,
): string {
  const priorChapters = chapters.filter((chapter) => chapter.order < beforeChapterOrder)
  if (priorChapters.length === 0) return ''

  return priorChapters
    .map((chapter) => {
      const chapterParagraphs = paragraphs.filter((paragraph) => paragraph.chapterId === chapter.id)
      const body = chapterParagraphs
        .map((paragraph) => paragraph.content.trim())
        .filter(Boolean)
        .join('\n\n')
      return `## ${chapter.title}\n${body}`.trim()
    })
    .filter(Boolean)
    .join('\n\n---\n\n')
}

async function createChapterOutline(
  engine: MLCEngine,
  story: Story,
  characters: Character[],
  callbacks: GenerationCallbacks,
): Promise<Chapter[]> {
  const chapterCount = clampPlannedChapterCount(story.plannedChapterCount)
  const wordsPerChapter = clampChapterWordTarget(story.chapterWordTarget)

  const outlineText = await streamStoryCompletion(
    engine,
    buildSystemPrompt(story.language, story.readerAge),
    buildChapterOutlinePrompt({
      language: story.language,
      storyPrompt: story.prompt,
      characters,
      chapterCount,
      wordsPerChapter,
    }),
    {
      language: story.language,
      onToken: () => {},
      signal: callbacks.signal,
      temperature: generationTemperature(story.language),
    },
  )

  let outline = parseChapterOutline(outlineText)
  if (outline.length === 0) {
    outline = Array.from({ length: chapterCount }, (_, index) => ({
      title: defaultChapterTitle(story.language, index + 1),
      brief: '',
    }))
  } else if (outline.length > chapterCount) {
    outline = outline.slice(0, chapterCount)
  } else {
    while (outline.length < chapterCount) {
      outline.push({
        title: defaultChapterTitle(story.language, outline.length + 1),
        brief: '',
      })
    }
  }

  return replaceChaptersForStory(
    story.id,
    outline.map((item, index) => ({
      id: generateId(),
      title: item.title,
      brief: item.brief,
      order: index,
      targetWordCount: wordsPerChapter,
      isFinale: index === outline.length - 1,
    })),
  )
}

async function generateChapterContent(
  engine: MLCEngine,
  story: Story,
  characters: Character[],
  chapter: Chapter,
  allChapters: Chapter[],
  allParagraphs: Paragraph[],
  existingChapterParagraphs: Paragraph[],
  callbacks: GenerationCallbacks,
  options: {
    chapterNumber: number
    totalChapters?: number
    isFinale?: boolean
  },
): Promise<Paragraph[]> {
  if (isChapterComplete(chapter, allParagraphs, allChapters)) return []

  const newParagraphs: Paragraph[] = []
  let wordsSoFar = getChapterWordCount(chapter.id, allParagraphs, undefined, allChapters)
  let order =
    existingChapterParagraphs.length > 0
      ? Math.max(...existingChapterParagraphs.map((paragraph) => paragraph.order)) + 1
      : await getNextParagraphOrder(story.id)
  let chunkAttempts = 0

  const priorChaptersText = buildPriorChaptersText(allChapters, allParagraphs, chapter.order)

  while (wordsSoFar < chapter.targetWordCount) {
    if (callbacks.signal?.aborted) break
    chunkAttempts += 1

    const currentInChapter = [
      ...existingChapterParagraphs,
      ...newParagraphs,
    ]

    const userPrompt = buildChapterGeneratePrompt({
      language: story.language,
      storyPrompt: story.prompt,
      characters,
      chapterTitle: chapter.title,
      chapterBrief: chapter.brief,
      chapterNumber: options.chapterNumber,
      totalChapters: options.totalChapters,
      priorChaptersText,
      currentChapterParagraphs: currentInChapter,
      wordsSoFar,
      targetWordCount: chapter.targetWordCount,
      chunkWordTarget: CHUNK_WORD_TARGET,
      isFinale: options.isFinale,
    })

    let streamingContent = ''
    const paragraph = await addParagraph(story.id, {
      content: '',
      source: 'ai',
      order,
      chapterId: chapter.id,
    })
    callbacks.onParagraphStart(paragraph)

    try {
      const chunkText = await streamStoryCompletion(
        engine,
        buildSystemPrompt(story.language, story.readerAge),
        userPrompt,
        {
          language: story.language,
          onToken: (token) => {
            streamingContent += token
            callbacks.onToken(token, paragraph.id)
          },
          onResetStream: () => {
            streamingContent = ''
            callbacks.onResetStream?.(paragraph.id)
          },
          signal: callbacks.signal,
          temperature: generationTemperature(story.language),
        },
      )

      const finalContent = chunkText || streamingContent
      const saved = await finalizeGeneratedParagraph(paragraph, finalContent, 'ai')
      if (!saved) {
        if (shouldStopGenerationLoop(wordsSoFar, chapter.targetWordCount, chunkAttempts, 0)) {
          if (chunkAttempts >= MAX_GENERATION_CHUNKS) callbacks.onChunkLimitReached?.()
          break
        }
        continue
      }
      newParagraphs.push(saved)
      callbacks.onParagraphComplete(saved)

      const wordsInChunk = countWords(saved.content)
      wordsSoFar += wordsInChunk
      callbacks.onProgress(wordsSoFar, chapter.targetWordCount)
      order += 1

      if (shouldStopGenerationLoop(wordsSoFar, chapter.targetWordCount, chunkAttempts, wordsInChunk)) {
        if (chunkAttempts >= MAX_GENERATION_CHUNKS && wordsSoFar < chapter.targetWordCount) {
          callbacks.onChunkLimitReached?.()
        }
        break
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (streamingContent.trim()) {
          const saved = await finalizeGeneratedParagraph(paragraph, streamingContent, 'ai')
          if (saved) {
            newParagraphs.push(saved)
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

  return newParagraphs
}

export async function generateOrContinueAutomaticBook(
  engine: MLCEngine,
  story: Story,
  characters: Character[],
  existingChapters: Chapter[],
  existingParagraphs: Paragraph[],
  callbacks: GenerationCallbacks,
): Promise<{ chapters: Chapter[]; paragraphs: Paragraph[] }> {
  const chapters =
    existingChapters.length > 0
      ? [...existingChapters].sort((a, b) => a.order - b.order)
      : await createChapterOutline(engine, story, characters, callbacks)

  if (
    existingChapters.length === 0 &&
    useStoryStore.getState().activeStoryId === story.id
  ) {
    useStoryStore.getState().updateActiveChapters(chapters)
  }

  let allParagraphs = [...existingParagraphs]

  const totalTarget = chapters.reduce((sum, chapter) => sum + chapter.targetWordCount, 0)

  for (let index = 0; index < chapters.length; index += 1) {
    if (callbacks.signal?.aborted) break

    const chapter = chapters[index]
    if (isChapterComplete(chapter, allParagraphs, chapters)) continue

    const chapterParagraphs = allParagraphs.filter(
      (paragraph) => paragraph.chapterId === chapter.id,
    )

    const newParagraphs = await generateChapterContent(
      engine,
      story,
      characters,
      chapter,
      chapters,
      allParagraphs,
      chapterParagraphs,
      {
        ...callbacks,
        onProgress: (words, target) => {
          const priorComplete = chapters
            .slice(0, index)
            .reduce(
              (sum, item) => sum + getChapterWordCount(item.id, allParagraphs, undefined, chapters),
              0,
            )
          callbacks.onProgress(priorComplete + words, totalTarget)
          void target
        },
      },
      {
        chapterNumber: index + 1,
        totalChapters: chapters.length,
        isFinale: index === chapters.length - 1,
      },
    )

    allParagraphs = [...allParagraphs, ...newParagraphs]
    const completedWords = chapters.reduce(
      (sum, item) => sum + getChapterWordCount(item.id, allParagraphs, undefined, chapters),
      0,
    )
    callbacks.onProgress(completedWords, totalTarget)
  }

  const fullyComplete = chapters.every((chapter) =>
    isChapterComplete(chapter, allParagraphs, chapters),
  )

  if (fullyComplete) {
    if (story.title === untitledStoryTitle(story.language) && chapters[0]?.title) {
      await updateStory(story.id, {
        title: truncateTitle(chapters[0].title),
        isBookFinished: true,
      })
    } else {
      await updateStory(story.id, { isBookFinished: fullyComplete })
    }
  } else {
    await updateStory(story.id, { isBookFinished: false })
  }

  return { chapters, paragraphs: allParagraphs }
}

/** @deprecated Use generateOrContinueAutomaticBook */
export const generateAutomaticBook = generateOrContinueAutomaticBook

export async function generateAdvancedChapter(
  engine: MLCEngine,
  story: Story,
  characters: Character[],
  existingChapters: Chapter[],
  existingParagraphs: Paragraph[],
  chapterBrief: string,
  callbacks: GenerationCallbacks,
): Promise<{ chapter: Chapter; paragraphs: Paragraph[] }> {
  const sorted = [...existingChapters].sort((a, b) => a.order - b.order)
  const lastChapter = sorted[sorted.length - 1]

  if (lastChapter && !isChapterComplete(lastChapter, existingParagraphs, sorted)) {
    const chapterParagraphs = existingParagraphs.filter(
      (paragraph) => paragraph.chapterId === lastChapter.id,
    )
    const newParagraphs = await generateChapterContent(
      engine,
      story,
      characters,
      lastChapter,
      sorted,
      existingParagraphs,
      chapterParagraphs,
      callbacks,
      { chapterNumber: sorted.length },
    )
    return {
      chapter: lastChapter,
      paragraphs: [...existingParagraphs, ...newParagraphs],
    }
  }
  const order = await getNextChapterOrder(story.id)
  const targetWordCount = clampChapterWordTarget(story.chapterWordTarget)
  const chapterNumber = sorted.length + 1
  const defaultTitle = defaultChapterTitle(story.language, chapterNumber)

  const chapter = await addChapter(story.id, {
    title: defaultTitle,
    brief: chapterBrief.trim(),
    order,
    targetWordCount,
    isFinale: false,
  })

  const newParagraphs = await generateChapterContent(
    engine,
    story,
    characters,
    chapter,
    [...sorted, chapter],
    existingParagraphs,
    [],
    callbacks,
    { chapterNumber },
  )

  if (chapterNumber === 1 && story.title === untitledStoryTitle(story.language)) {
    const firstWords = newParagraphs[0]?.content ?? chapter.brief
    if (firstWords.trim()) {
      await updateStory(story.id, { title: truncateTitle(firstWords) })
    }
  }

  return { chapter, paragraphs: [...existingParagraphs, ...newParagraphs] }
}

export async function continueAdvancedBook(
  engine: MLCEngine,
  story: Story,
  characters: Character[],
  existingChapters: Chapter[],
  existingParagraphs: Paragraph[],
  callbacks: GenerationCallbacks,
): Promise<{ chapters: Chapter[]; paragraphs: Paragraph[] }> {
  const sorted = [...existingChapters].sort((a, b) => a.order - b.order)
  let allParagraphs = [...existingParagraphs]

  for (let index = 0; index < sorted.length; index += 1) {
    if (callbacks.signal?.aborted) break
    const chapter = sorted[index]
    if (isChapterComplete(chapter, allParagraphs, sorted)) continue

    const chapterParagraphs = allParagraphs.filter(
      (paragraph) => paragraph.chapterId === chapter.id,
    )
    const newParagraphs = await generateChapterContent(
      engine,
      story,
      characters,
      chapter,
      sorted,
      allParagraphs,
      chapterParagraphs,
      callbacks,
      { chapterNumber: index + 1 },
    )
    allParagraphs = [...allParagraphs, ...newParagraphs]
  }

  return { chapters: sorted, paragraphs: allParagraphs }
}

export async function finishAdvancedBook(
  engine: MLCEngine,
  story: Story,
  characters: Character[],
  existingChapters: Chapter[],
  existingParagraphs: Paragraph[],
  callbacks: GenerationCallbacks,
): Promise<{ chapter: Chapter; paragraphs: Paragraph[] }> {
  const sorted = [...existingChapters].sort((a, b) => a.order - b.order)
  let allParagraphs = [...existingParagraphs]
  const lastChapter = sorted[sorted.length - 1]

  if (lastChapter && !isChapterComplete(lastChapter, allParagraphs, sorted)) {
    const chapterParagraphs = allParagraphs.filter(
      (paragraph) => paragraph.chapterId === lastChapter.id,
    )
    const newParagraphs = await generateChapterContent(
      engine,
      story,
      characters,
      lastChapter,
      sorted,
      allParagraphs,
      chapterParagraphs,
      callbacks,
      { chapterNumber: sorted.length },
    )
    allParagraphs = [...allParagraphs, ...newParagraphs]
  }

  const hasFinale = sorted.some((chapter) => chapter.isFinale)
  if (hasFinale) {
    const finale = sorted.find((chapter) => chapter.isFinale)!
    if (!isChapterComplete(finale, allParagraphs, sorted)) {
      const chapterParagraphs = allParagraphs.filter(
        (paragraph) => paragraph.chapterId === finale.id,
      )
      const newParagraphs = await generateChapterContent(
        engine,
        story,
        characters,
        finale,
        sorted,
        allParagraphs,
        chapterParagraphs,
        callbacks,
        { chapterNumber: sorted.length, isFinale: true },
      )
      allParagraphs = [...allParagraphs, ...newParagraphs]
    }
    if (isChapterComplete(finale, allParagraphs, sorted)) {
      await updateStory(story.id, { isBookFinished: true })
    }
    return { chapter: finale, paragraphs: allParagraphs }
  }

  const chapterWordCounts = sorted.map((chapter) =>
    getChapterWordCount(chapter.id, allParagraphs, undefined, sorted),
  )

  const finaleTarget = computeFinaleWordTarget(chapterWordCounts, story.finishPercent)
  const order = await getNextChapterOrder(story.id)
  const finaleTitle = finaleChapterTitle(story.language)

  const chapter = await addChapter(story.id, {
    title: finaleTitle,
    brief: finaleChapterBrief(story.language),
    order,
    targetWordCount: finaleTarget,
    isFinale: true,
  })

  const newParagraphs = await generateChapterContent(
    engine,
    story,
    characters,
    chapter,
    [...sorted, chapter],
    allParagraphs,
    [],
    callbacks,
    {
      chapterNumber: sorted.length + 1,
      isFinale: true,
    },
  )

  const combined = [...allParagraphs, ...newParagraphs]
  if (
    !callbacks.signal?.aborted &&
    isChapterComplete(chapter, combined, [...sorted, chapter])
  ) {
    await updateStory(story.id, { isBookFinished: true })
  }
  return {
    chapter,
    paragraphs: combined,
  }
}
