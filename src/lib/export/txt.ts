import { languageDisplay } from '@/lib/language'
import { groupParagraphsByChapter } from '@/lib/chapterParagraphs'
import {
  formatCharacterListValue,
  hasMultipleCharacterValues,
  joinCharacterList,
  splitCharacterList,
} from '@/lib/characterFields'
import type { Character, Chapter, Paragraph, Story } from '@/types/story'

function formatCharacter(char: Character): string {
  const alignment = char.alignment === 'good' ? 'Good' : 'Bad'
  const gender = char.gender === 'boy' ? 'Boy' : 'Girl'
  const isHuman = char.isHuman ?? true
  const speciesItems = splitCharacterList(char.species)
  const speciesPart = isHuman
    ? 'human'
    : speciesItems.length > 0
      ? hasMultipleCharacterValues(char.species)
        ? `species: ${joinCharacterList(speciesItems)}`
        : `species: ${speciesItems[0]}`
      : 'non-human'
  const powerItems = splitCharacterList(char.superpowerDescription)
  const powers = char.hasSuperpowers
    ? powerItems.length > 1
      ? `Superpowers: ${joinCharacterList(powerItems)}`
      : powerItems.length === 1
        ? powerItems[0]!
        : 'Has superpowers'
    : 'No superpowers'
  const nicknames = formatCharacterListValue(char.nickname)
  const namePart = nicknames ? `${char.name} (nickname: ${nicknames})` : char.name
  const petNames = formatCharacterListValue(char.petName, 'Unnamed')
  const petSpecies = formatCharacterListValue(char.petSpecies, 'unknown species')
  const petPowerItems = splitCharacterList(char.petSuperpowerDescription)
  const petPart = char.hasPet
    ? char.petHasSuperpowers
      ? petPowerItems.length > 1
        ? `Pets: ${petNames} (${petSpecies}) — Superpowers: ${joinCharacterList(petPowerItems)}`
        : `Pet: ${petNames} (${petSpecies}) — ${petPowerItems[0]?.trim() || 'has superpowers'}`
      : hasMultipleCharacterValues(char.petName) || hasMultipleCharacterValues(char.petSpecies)
        ? `Pets: ${petNames} (${petSpecies}) — no superpowers`
        : `Pet: ${petNames} (${petSpecies}) — no superpowers`
    : 'No pet'
  const vehicleTypes = formatCharacterListValue(char.vehicleType, 'Unnamed')
  const vehicleColors = formatCharacterListValue(char.vehicleColor, 'unknown color')
  const vehicleSpeeds = formatCharacterListValue(char.vehicleSpeed, 'unknown speed')
  const vehiclePart = char.hasVehicle
    ? hasMultipleCharacterValues(char.vehicleType) ||
      hasMultipleCharacterValues(char.vehicleColor) ||
      hasMultipleCharacterValues(char.vehicleSpeed)
      ? `Vehicles: ${vehicleTypes} — colors: ${vehicleColors} — speeds: ${vehicleSpeeds}`
      : `Vehicle: ${vehicleTypes} — ${vehicleColors} — ${vehicleSpeeds}`
    : 'No vehicle'
  return `- ${namePart} (${alignment}, ${gender}, age ${char.age}, ${speciesPart}): ${powers}. ${petPart}. ${vehiclePart}`
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

function sanitizeExportFilename(title: string): string {
  const sanitized = title
    .trim()
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0)
      if (code < 32) return false
      return !'<>:"/\\|?*'.includes(char)
    })
    .join('')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
    .trim()
  return sanitized || 'story'
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
  const safeTitle = sanitizeExportFilename(story.title)
  anchor.href = url
  anchor.download = `${safeTitle}.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}
