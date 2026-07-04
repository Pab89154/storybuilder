import type { Chapter, Paragraph } from '@/types/story'

export interface ChapterParagraphGroup {
  chapter: Chapter
  paragraphs: Paragraph[]
}

/** Assign orphan paragraphs (no chapterId) to the first chapter — matches read-mode pagination. */
export function resolveParagraphChapterId(
  paragraph: Paragraph,
  chapters: Chapter[],
): string | null {
  if (paragraph.chapterId) return paragraph.chapterId
  const sorted = [...chapters].sort((a, b) => a.order - b.order)
  return sorted[0]?.id ?? null
}

export function groupParagraphsByChapter(
  chapters: Chapter[],
  paragraphs: Paragraph[],
): ChapterParagraphGroup[] {
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order)
  const sortedParagraphs = [...paragraphs].sort((a, b) => a.order - b.order)
  const byChapter = new Map<string, Paragraph[]>()

  for (const chapter of sortedChapters) {
    byChapter.set(chapter.id, [])
  }

  for (const paragraph of sortedParagraphs) {
    const chapterId = resolveParagraphChapterId(paragraph, sortedChapters)
    if (!chapterId) continue
    const bucket = byChapter.get(chapterId)
    if (bucket) bucket.push(paragraph)
    else if (sortedChapters[0]) {
      byChapter.get(sortedChapters[0].id)?.push(paragraph)
    }
  }

  return sortedChapters
    .map((chapter) => ({
      chapter,
      paragraphs: byChapter.get(chapter.id) ?? [],
    }))
    .filter((group) => group.paragraphs.length > 0)
}
