import { resolveParagraphChapterId } from '@/lib/chapterParagraphs'
import { countChapterWords, countWords, type StreamingWordCount } from '@/lib/wordCount'
import type { Chapter, Paragraph } from '@/types/story'

export type ChapterStatus = 'pending' | 'in_progress' | 'complete'

export function getChapterWordCount(
  chapterId: string,
  paragraphs: Paragraph[],
  streaming?: StreamingWordCount,
  chapters?: Chapter[],
): number {
  if (chapters?.length) {
    return paragraphs
      .filter((paragraph) => resolveParagraphChapterId(paragraph, chapters) === chapterId)
      .reduce((sum, paragraph) => {
        const text =
          streaming?.paragraphId === paragraph.id ? streaming.content : paragraph.content
        return sum + countWords(text)
      }, 0)
  }
  return countChapterWords(chapterId, paragraphs, streaming)
}

export function isChapterComplete(
  chapter: Chapter,
  paragraphs: Paragraph[],
  chapters?: Chapter[],
): boolean {
  const words = getChapterWordCount(chapter.id, paragraphs, undefined, chapters)
  return words >= chapter.targetWordCount * 0.95
}

export function getChapterStatus(
  chapter: Chapter,
  paragraphs: Paragraph[],
  chapters?: Chapter[],
): ChapterStatus {
  const words = getChapterWordCount(chapter.id, paragraphs, undefined, chapters)
  if (words === 0) return 'pending'
  if (isChapterComplete(chapter, paragraphs, chapters)) return 'complete'
  return 'in_progress'
}

export interface BookProgress {
  completedCount: number
  inProgressChapter: Chapter | null
  pendingCount: number
  totalChapters: number
  canContinue: boolean
  isFullyComplete: boolean
}

export function getBookProgress(chapters: Chapter[], paragraphs: Paragraph[]): BookProgress {
  if (chapters.length === 0) {
    return {
      completedCount: 0,
      inProgressChapter: null,
      pendingCount: 0,
      totalChapters: 0,
      canContinue: false,
      isFullyComplete: false,
    }
  }

  const statuses = chapters.map((chapter) => getChapterStatus(chapter, paragraphs, chapters))
  const completedCount = statuses.filter((status) => status === 'complete').length
  const inProgressIndex = statuses.findIndex((status) => status === 'in_progress')
  const inProgressChapter = inProgressIndex >= 0 ? chapters[inProgressIndex] : null
  const pendingCount = statuses.filter((status) => status === 'pending').length

  return {
    completedCount,
    inProgressChapter,
    pendingCount,
    totalChapters: chapters.length,
    canContinue: inProgressChapter !== null || pendingCount > 0,
    isFullyComplete: completedCount === chapters.length && chapters.length > 0,
  }
}
