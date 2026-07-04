import { resolveParagraphChapterId } from '@/lib/chapterParagraphs'
import type { Chapter, Paragraph } from '@/types/story'

export const LINES_PER_PAGE = 22
export const CHARS_PER_LINE = 68

export interface StoryPage {
  index: number
  lines: string[]
  chapterTitle?: string
  /** Dedicated page showing only the chapter title before the chapter text. */
  isChapterTitlePage?: boolean
}

export interface PaginateOptions {
  streamingParagraphId?: string | null
  streamingContent?: string
}

export interface PaginationLayout {
  linesPerPage: number
  charsPerLine: number
}

export const DEFAULT_PAGINATION_LAYOUT: PaginationLayout = {
  linesPerPage: LINES_PER_PAGE,
  charsPerLine: CHARS_PER_LINE,
}

function wrapTextBlock(text: string, maxChars: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const lines: string[] = []
  let current = ''

  for (const word of normalized.split(' ')) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }

    if (current) lines.push(current)
    if (word.length <= maxChars) {
      current = word
      continue
    }

    let start = 0
    while (start < word.length) {
      lines.push(word.slice(start, start + maxChars))
      start += maxChars
    }
    current = ''
  }

  if (current) lines.push(current)
  return lines
}

function paragraphContent(
  paragraph: Paragraph,
  options?: PaginateOptions,
): string {
  if (options?.streamingParagraphId === paragraph.id) {
    return options.streamingContent ?? paragraph.content
  }
  return paragraph.content
}

function padLinesToPage(lines: string[], layout: PaginationLayout): void {
  const remainder = lines.length % layout.linesPerPage
  if (remainder === 0) return
  for (let index = 0; index < layout.linesPerPage - remainder; index += 1) {
    lines.push('')
  }
}

function sortedChapters(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => a.order - b.order)
}

function chapterTitleForId(chapters: Chapter[] | undefined, chapterId: string | null): string | undefined {
  if (!chapters || !chapterId) return undefined
  return chapters.find((chapter) => chapter.id === chapterId)?.title
}

function insertChapterTitlePage(
  lines: string[],
  chapterStarts: Map<number, string>,
  title: string,
  layout: PaginationLayout,
) {
  if (lines.length > 0) padLinesToPage(lines, layout)
  const pageIndex = Math.floor(lines.length / layout.linesPerPage)
  chapterStarts.set(pageIndex, title)
  const remainder = lines.length % layout.linesPerPage
  const fill = remainder === 0 ? layout.linesPerPage : layout.linesPerPage - remainder
  for (let i = 0; i < fill; i += 1) lines.push('')
}

export function buildStoryLines(
  paragraphs: Paragraph[],
  options?: PaginateOptions,
  layout: PaginationLayout = DEFAULT_PAGINATION_LAYOUT,
  chapters?: Chapter[],
): { lines: string[]; chapterStarts: Map<number, string> } {
  const lines: string[] = []
  const chapterStarts = new Map<number, string>()
  let previousChapterId: string | null | undefined = undefined
  const sortedParagraphs = [...paragraphs].sort((a, b) => a.order - b.order)

  if (chapters?.length) {
    const firstChapter = sortedChapters(chapters)[0]
    const firstTitle = firstChapter?.title?.trim()
    const hasFirstChapterText = sortedParagraphs.some(
      (paragraph) => resolveParagraphChapterId(paragraph, chapters) === firstChapter?.id,
    )
    const shouldShowFirstTitlePage =
      Boolean(firstChapter && firstTitle) &&
      (sortedParagraphs.length === 0 ||
        hasFirstChapterText ||
        Boolean(options?.streamingParagraphId))

    if (firstChapter && firstTitle && shouldShowFirstTitlePage) {
      insertChapterTitlePage(lines, chapterStarts, firstTitle, layout)
      previousChapterId = firstChapter.id
    }
  }

  sortedParagraphs.forEach((paragraph, index) => {
    const chapterId = chapters ? resolveParagraphChapterId(paragraph, chapters) : null
    if (chapters && chapterId && chapterId !== previousChapterId) {
      const title = chapterTitleForId(chapters, chapterId)?.trim()
      if (title) insertChapterTitlePage(lines, chapterStarts, title, layout)
      previousChapterId = chapterId
    }

    if (index > 0 && !chapters) lines.push('')

    const content = paragraphContent(paragraph, options)
    const chunks = content.split('\n')

    chunks.forEach((chunk, chunkIndex) => {
      if (chunkIndex > 0) lines.push('')
      lines.push(...wrapTextBlock(chunk, layout.charsPerLine))
    })
  })

  return { lines, chapterStarts }
}

export function paginateStory(
  paragraphs: Paragraph[],
  options?: PaginateOptions,
  layout: PaginationLayout = DEFAULT_PAGINATION_LAYOUT,
  chapters?: Chapter[],
): StoryPage[] {
  const sortedParagraphs = [...paragraphs].sort((a, b) => a.order - b.order)
  const { lines: allLines, chapterStarts } = buildStoryLines(
    sortedParagraphs,
    options,
    layout,
    chapters,
  )

  if (allLines.length === 0) {
    return [
      {
        index: 0,
        lines: Array.from({ length: layout.linesPerPage }, () => ''),
      },
    ]
  }

  const pages: StoryPage[] = []
  for (let start = 0; start < allLines.length; start += layout.linesPerPage) {
    const slice = allLines.slice(start, start + layout.linesPerPage)
    while (slice.length < layout.linesPerPage) slice.push('')
    const pageIndex = pages.length
    pages.push({
      index: pageIndex,
      lines: slice,
      chapterTitle: chapterStarts.get(pageIndex),
      isChapterTitlePage: chapterStarts.has(pageIndex),
    })
  }

  return pages
}

export function findPageForParagraph(
  paragraphs: Paragraph[],
  paragraphId: string,
  options?: PaginateOptions,
  layout: PaginationLayout = DEFAULT_PAGINATION_LAYOUT,
  chapters?: Chapter[],
): number | null {
  const sortedParagraphs = [...paragraphs].sort((a, b) => a.order - b.order)
  let lineOffset = 0
  let previousChapterId: string | null | undefined = undefined

  if (chapters?.length) {
    const firstChapter = sortedChapters(chapters)[0]
    const firstTitle = firstChapter?.title?.trim()
    const hasFirstChapterText = sortedParagraphs.some(
      (paragraph) => resolveParagraphChapterId(paragraph, chapters) === firstChapter?.id,
    )
    const shouldShowFirstTitlePage =
      Boolean(firstChapter && firstTitle) &&
      (sortedParagraphs.length === 0 ||
        hasFirstChapterText ||
        Boolean(options?.streamingParagraphId))

    if (firstChapter && firstTitle && shouldShowFirstTitlePage) {
      if (lineOffset > 0) {
        const remainder = lineOffset % layout.linesPerPage
        if (remainder !== 0) lineOffset += layout.linesPerPage - remainder
      }
      lineOffset += layout.linesPerPage
      previousChapterId = firstChapter.id
    }
  }

  for (let index = 0; index < sortedParagraphs.length; index += 1) {
    const paragraph = sortedParagraphs[index]

    if (chapters?.length) {
      const chapterId = resolveParagraphChapterId(paragraph, chapters)
      if (chapterId && chapterId !== previousChapterId) {
        const title = chapterTitleForId(chapters, chapterId)?.trim()
        if (title) {
          if (lineOffset > 0) {
            const remainder = lineOffset % layout.linesPerPage
            if (remainder !== 0) lineOffset += layout.linesPerPage - remainder
          }
          lineOffset += layout.linesPerPage
        }
        previousChapterId = chapterId
      }
    } else if (index > 0) {
      lineOffset += 1
    }

    if (paragraph.id === paragraphId) {
      return Math.floor(lineOffset / layout.linesPerPage)
    }

    const content = paragraphContent(paragraph, options)
    const chunks = content.split('\n')
    chunks.forEach((chunk, chunkIndex) => {
      if (chunkIndex > 0) lineOffset += 1
      lineOffset += wrapTextBlock(chunk, layout.charsPerLine).length
    })
  }

  return null
}
