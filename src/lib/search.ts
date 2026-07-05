import type { Character, Chapter, Paragraph, Story } from '@/types/story'

export function buildSearchText(
  story: Pick<Story, 'title' | 'prompt' | 'genre' | 'storyBeginning' | 'storyEnding'>,
  characters: Character[],
  paragraphs: Paragraph[],
  chapters: Chapter[] = [],
): string {
  const parts = [
    story.title,
    story.prompt,
    story.genre,
    story.storyBeginning,
    story.storyEnding,
    ...characters.map((c) => c.name),
    ...characters.map((c) => c.species ?? ''),
    ...characters.map((c) => c.petName ?? ''),
    ...characters.map((c) => c.petSpecies ?? ''),
    ...chapters.map((c) => c.title),
    ...chapters.map((c) => c.brief),
    ...paragraphs.map((p) => p.content),
  ]
  return parts.join(' ').toLowerCase()
}

export function storyMatchesQuery(story: Story, query: string): boolean {
  if (!query.trim()) return true
  return story.searchText.includes(query.trim().toLowerCase())
}

export function collectGenres(stories: Story[]): string[] {
  const genres = new Set<string>()
  for (const story of stories) {
    const genre = story.genre?.trim()
    if (genre) genres.add(genre)
  }
  return Array.from(genres).sort((a, b) => a.localeCompare(b))
}
