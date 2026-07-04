import { groupParagraphsByChapter } from '@/lib/chapterParagraphs'
import { ParagraphBlock } from '@/components/story/ParagraphBlock'
import type { Chapter, Paragraph } from '@/types/story'
import { cn } from '@/lib/utils'

interface StoryEditBodyProps {
  chapters: Chapter[]
  paragraphs: Paragraph[]
}

export function StoryEditBody({ chapters, paragraphs }: StoryEditBodyProps) {
  if (paragraphs.length === 0) return null

  if (chapters.length === 0) {
    return (
      <article className="story-edit-prose">
        {paragraphs.map((paragraph) => (
          <ParagraphBlock key={paragraph.id} paragraph={paragraph} variant="flow" />
        ))}
      </article>
    )
  }

  const groups = groupParagraphsByChapter(chapters, paragraphs)

  return (
    <article className="story-edit-prose">
      {groups.map(({ chapter, paragraphs: chapterParagraphs }) => (
        <section key={chapter.id} className="story-edit-chapter">
          <h2
            className={cn(
              'story-edit-chapter-title',
              'mb-6 mt-10 text-center font-serif text-3xl font-semibold tracking-tight text-stone-900 first:mt-0',
            )}
          >
            {chapter.title}
          </h2>
          {chapterParagraphs.map((paragraph) => (
            <ParagraphBlock key={paragraph.id} paragraph={paragraph} variant="flow" />
          ))}
        </section>
      ))}
    </article>
  )
}
