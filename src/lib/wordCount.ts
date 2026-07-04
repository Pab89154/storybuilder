import type { Paragraph } from '@/types/story'

export type StreamingWordCount = {
  paragraphId: string
  content: string
} | null

/** Count words in plain story text (whitespace-separated tokens). */
export function countWords(text: string): number {
  const normalized = text
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
  if (!normalized) return 0
  return normalized.split(/\s+/).filter(Boolean).length
}

export function countParagraphsWords(
  paragraphs: Paragraph[],
  streaming?: StreamingWordCount,
): number {
  return paragraphs.reduce((sum, paragraph) => {
    const text =
      streaming?.paragraphId === paragraph.id ? streaming.content : paragraph.content
    return sum + countWords(text)
  }, 0)
}

export function countChapterWords(
  chapterId: string,
  paragraphs: Paragraph[],
  streaming?: StreamingWordCount,
): number {
  return paragraphs
    .filter((paragraph) => paragraph.chapterId === chapterId)
    .reduce((sum, paragraph) => {
      const text =
        streaming?.paragraphId === paragraph.id ? streaming.content : paragraph.content
      return sum + countWords(text)
    }, 0)
}
