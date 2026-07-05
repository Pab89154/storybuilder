import { languageDisplay } from '@/lib/language'
import { groupParagraphsByChapter } from '@/lib/chapterParagraphs'
import type { Character, Chapter, Paragraph, Story } from '@/types/story'

function formatCharacter(char: Character): string {
  const alignment = char.alignment === 'good' ? 'Good' : 'Bad'
  const gender = char.gender === 'boy' ? 'Boy' : 'Girl'
  const isHuman = char.isHuman ?? true
  const speciesPart = isHuman
    ? 'human'
    : char.species?.trim()
      ? `species: ${char.species.trim()}`
      : 'non-human'
  const powers = char.hasSuperpowers
    ? char.superpowerDescription?.trim() || 'Has superpowers'
    : 'No superpowers'
  const petPart = char.hasPet
    ? char.petHasSuperpowers
      ? `Pet: ${char.petName?.trim() || 'Unnamed'} (${char.petSpecies?.trim() || 'unknown species'}) — ${
          char.petSuperpowerDescription?.trim() || 'has superpowers'
        }`
      : `Pet: ${char.petName?.trim() || 'Unnamed'} (${char.petSpecies?.trim() || 'unknown species'}) — no superpowers`
    : 'No pet'
  return `- ${char.name} (${alignment}, ${gender}, age ${char.age}, ${speciesPart}): ${powers}. ${petPart}`
}

export function buildStoryText(
  story: Story,
  characters: Character[],
  paragraphs: Paragraph[],
  chapters: Chapter[] = [],
): string {
  const lines: string[] = [
    story.title,
    '='.repeat(Math.min(story.title.length, 60)),
    '',
    `Language: ${languageDisplay(story.language)}`,
    ...(story.genre?.trim() ? [`Genre: ${story.genre.trim()}`, ''] : ['']),
    'Story prompt:',
    story.prompt.trim() || '(none)',
    '',
  ]

  if (characters.length > 0) {
    lines.push('Characters:', ...characters.map(formatCharacter), '')
  }

  lines.push('Story:', '')
  if (chapters.length > 0) {
    for (const { chapter, paragraphs: chapterParagraphs } of groupParagraphsByChapter(
      chapters,
      paragraphs,
    )) {
      lines.push(`## ${chapter.title}`, '')
      for (const paragraph of chapterParagraphs) {
        lines.push(paragraph.content.trim(), '')
      }
    }
  } else {
    for (const paragraph of paragraphs) {
      lines.push(paragraph.content.trim(), '')
    }
  }

  return lines.join('\n').trim() + '\n'
}

export function downloadStoryTxt(
  story: Story,
  characters: Character[],
  paragraphs: Paragraph[],
  chapters: Chapter[] = [],
): void {
  const content = buildStoryText(story, characters, paragraphs, chapters)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const safeTitle = story.title.replace(/[^\w\s-]/g, '').trim() || 'story'
  anchor.href = url
  anchor.download = `${safeTitle}.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}
