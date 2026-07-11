import type {
  BookCreationMode,
  Character,
  Chapter,
  Folder,
  Paragraph,
  Story,
  StoryWithDetails,
} from '@/types/story'
import {
  DEFAULT_CHAPTER_WORDS,
  DEFAULT_FINISH_PERCENT,
  DEFAULT_PLANNED_CHAPTERS,
  DEFAULT_READER_AGE,
  DEFAULT_TARGET_WORD_COUNT,
} from '@/types/story'
import { buildSearchText } from '@/lib/search'
import { generateId } from '@/lib/utils'

const guestStories = new Map<string, StoryWithDetails>()
const guestFolders = new Map<string, Folder>()

function touchSearchText(details: StoryWithDetails): StoryWithDetails {
  return {
    ...details,
    searchText: buildSearchText(
      details,
      details.characters,
      details.paragraphs,
      details.chapters,
    ),
    updatedAt: Date.now(),
  }
}

function saveGuestStory(details: StoryWithDetails): void {
  guestStories.set(details.id, touchSearchText(details))
}

export function clearGuestData(): void {
  guestStories.clear()
  guestFolders.clear()
}

export async function listStories(): Promise<Story[]> {
  return [...guestStories.values()]
    .map(({ characters: _c, chapters: _ch, paragraphs: _p, ...story }) => ({
      ...story,
      isGuest: true,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function listFolders(): Promise<Folder[]> {
  return [...guestFolders.values()].sort((a, b) => a.order - b.order)
}

export async function getStoryWithDetails(storyId: string): Promise<StoryWithDetails | null> {
  const story = guestStories.get(storyId)
  return story ? { ...story, isGuest: true } : null
}

export async function rebuildStorySearchIndex(storyId: string): Promise<void> {
  const story = guestStories.get(storyId)
  if (!story) return
  saveGuestStory(story)
}

export async function createStory(input: {
  title?: string
  language: Story['language']
  prompt?: string
  genre?: string
  folderId?: string | null
  creationMode?: BookCreationMode
  readerAge?: number
}): Promise<Story> {
  const now = Date.now()
  const storyId = generateId()
  const details: StoryWithDetails = {
    id: storyId,
    title: input.title ?? 'Untitled story',
    language: input.language,
    prompt: input.prompt ?? '',
    genre: input.genre ?? '',
    folderId: input.folderId ?? null,
    sortOrder: guestStories.size,
    bookmarkPageIndex: null,
    searchText: '',
    targetWordCount: DEFAULT_TARGET_WORD_COUNT,
    creationMode: input.creationMode ?? 'automatic',
    plannedChapterCount: DEFAULT_PLANNED_CHAPTERS,
    storyBeginning: '',
    storyEnding: '',
    chapterWordTarget: DEFAULT_CHAPTER_WORDS,
    readerAge: input.readerAge ?? DEFAULT_READER_AGE,
    finishPercent: DEFAULT_FINISH_PERCENT,
    isBookFinished: false,
    createdAt: now,
    updatedAt: now,
    isGuest: true,
    characters: [],
    chapters: [],
    paragraphs: [],
  }
  saveGuestStory(details)
  const { characters: _c, chapters: _ch, paragraphs: _p, ...story } = details
  return story
}

export async function updateStory(
  storyId: string,
  updates: Partial<Story>,
): Promise<void> {
  const current = guestStories.get(storyId)
  if (!current) return
  saveGuestStory({ ...current, ...updates })
}

export async function setStoryBookmarkPage(
  storyId: string,
  bookmarkPageIndex: number | null,
): Promise<void> {
  await updateStory(storyId, { bookmarkPageIndex })
}

export async function moveStoryToFolder(storyId: string, folderId: string | null): Promise<void> {
  await updateStory(storyId, { folderId })
}

export async function moveStoryToPosition(
  storyId: string,
  targetFolderId: string | null,
  targetIndex: number,
): Promise<void> {
  const stories = await listStories()
  const story = stories.find((item) => item.id === storyId)
  if (!story) return
  const others = stories.filter((item) => item.id !== storyId)
  const targetStories = others
    .filter((item) => (item.folderId ?? null) === targetFolderId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const clampedIndex = Math.max(0, Math.min(targetIndex, targetStories.length))
  targetStories.splice(clampedIndex, 0, { ...story, folderId: targetFolderId })
  targetStories.forEach((item, index) => {
    void updateStory(item.id, { sortOrder: index, folderId: item.folderId })
  })
}

export async function reorderStoriesInFolder(
  _folderId: string | null,
  orderedStoryIds: string[],
): Promise<void> {
  for (let index = 0; index < orderedStoryIds.length; index += 1) {
    await updateStory(orderedStoryIds[index], { sortOrder: index })
  }
}

export async function deleteStory(storyId: string): Promise<void> {
  guestStories.delete(storyId)
}

export async function createFolder(name: string): Promise<Folder> {
  const now = Date.now()
  const folder: Folder = {
    id: generateId(),
    name: name.trim() || 'New collection',
    order: guestFolders.size,
    createdAt: now,
    updatedAt: now,
  }
  guestFolders.set(folder.id, folder)
  return folder
}

export async function updateFolder(
  folderId: string,
  updates: Partial<Pick<Folder, 'name' | 'order'>>,
): Promise<void> {
  const folder = guestFolders.get(folderId)
  if (!folder) return
  guestFolders.set(folderId, { ...folder, ...updates, updatedAt: Date.now() })
}

export async function deleteFolder(folderId: string): Promise<void> {
  for (const story of guestStories.values()) {
    if (story.folderId === folderId) {
      saveGuestStory({ ...story, folderId: null })
    }
  }
  guestFolders.delete(folderId)
}

export async function addCharacter(
  storyId: string,
  data: Omit<Character, 'id' | 'storyId'>,
): Promise<Character> {
  const current = guestStories.get(storyId)
  if (!current) throw new Error('Story not found')
  const character = { id: generateId(), storyId, ...data }
  saveGuestStory({ ...current, characters: [...current.characters, character] })
  return character
}

export async function updateCharacter(
  characterId: string,
  updates: Partial<Omit<Character, 'id' | 'storyId'>>,
): Promise<void> {
  for (const current of guestStories.values()) {
    if (!current.characters.some((character) => character.id === characterId)) continue
    saveGuestStory({
      ...current,
      characters: current.characters.map((character) =>
        character.id === characterId ? { ...character, ...updates } : character,
      ),
    })
    return
  }
}

export async function deleteCharacter(characterId: string): Promise<void> {
  for (const current of guestStories.values()) {
    if (!current.characters.some((character) => character.id === characterId)) continue
    saveGuestStory({
      ...current,
      characters: current.characters.filter((character) => character.id !== characterId),
    })
    return
  }
}

export async function addParagraph(
  storyId: string,
  data: Pick<Paragraph, 'content' | 'source' | 'order' | 'chapterId'>,
): Promise<Paragraph> {
  const current = guestStories.get(storyId)
  if (!current) throw new Error('Story not found')
  const now = Date.now()
  const paragraph: Paragraph = {
    id: generateId(),
    storyId,
    chapterId: data.chapterId ?? null,
    order: data.order,
    content: data.content,
    source: data.source,
    createdAt: now,
    updatedAt: now,
  }
  saveGuestStory({ ...current, paragraphs: [...current.paragraphs, paragraph] })
  return paragraph
}

export async function updateParagraph(
  paragraphId: string,
  updates: Partial<Pick<Paragraph, 'content' | 'source' | 'order'>>,
): Promise<void> {
  for (const current of guestStories.values()) {
    if (!current.paragraphs.some((paragraph) => paragraph.id === paragraphId)) continue
    saveGuestStory({
      ...current,
      paragraphs: current.paragraphs.map((paragraph) =>
        paragraph.id === paragraphId
          ? { ...paragraph, ...updates, updatedAt: Date.now() }
          : paragraph,
      ),
    })
    return
  }
}

export async function deleteParagraph(paragraphId: string): Promise<void> {
  for (const current of guestStories.values()) {
    if (!current.paragraphs.some((paragraph) => paragraph.id === paragraphId)) continue
    saveGuestStory({
      ...current,
      paragraphs: current.paragraphs.filter((paragraph) => paragraph.id !== paragraphId),
    })
    return
  }
}

export async function resetBookForRegeneration(
  storyId: string,
  options: { clearChapters: boolean },
): Promise<void> {
  const current = guestStories.get(storyId)
  if (!current) return
  saveGuestStory({
    ...current,
    paragraphs: [],
    chapters: options.clearChapters ? [] : current.chapters,
    isBookFinished: false,
    bookmarkPageIndex: null,
  })
}

export async function replaceParagraphContent(
  paragraphId: string,
  content: string,
  source: Paragraph['source'] = 'ai',
): Promise<void> {
  await updateParagraph(paragraphId, { content, source })
}

export async function getNextParagraphOrder(storyId: string): Promise<number> {
  const current = guestStories.get(storyId)
  if (!current || current.paragraphs.length === 0) return 0
  return current.paragraphs[current.paragraphs.length - 1].order + 1
}

export async function addChapter(
  storyId: string,
  data: Pick<Chapter, 'title' | 'brief' | 'order' | 'targetWordCount' | 'isFinale'>,
): Promise<Chapter> {
  const current = guestStories.get(storyId)
  if (!current) throw new Error('Story not found')
  const now = Date.now()
  const chapter: Chapter = {
    id: generateId(),
    storyId,
    title: data.title,
    brief: data.brief,
    order: data.order,
    targetWordCount: data.targetWordCount,
    isFinale: data.isFinale,
    createdAt: now,
    updatedAt: now,
  }
  saveGuestStory({ ...current, chapters: [...current.chapters, chapter] })
  return chapter
}

export async function updateChapter(
  chapterId: string,
  updates: Partial<Pick<Chapter, 'title' | 'brief' | 'targetWordCount' | 'order' | 'isFinale'>>,
): Promise<void> {
  for (const current of guestStories.values()) {
    if (!current.chapters.some((chapter) => chapter.id === chapterId)) continue
    saveGuestStory({
      ...current,
      chapters: current.chapters.map((chapter) =>
        chapter.id === chapterId ? { ...chapter, ...updates, updatedAt: Date.now() } : chapter,
      ),
    })
    return
  }
}

export async function deleteChaptersForStory(storyId: string): Promise<void> {
  const current = guestStories.get(storyId)
  if (!current) return
  saveGuestStory({ ...current, chapters: [] })
}

export async function getNextChapterOrder(storyId: string): Promise<number> {
  const current = guestStories.get(storyId)
  if (!current || current.chapters.length === 0) return 0
  return current.chapters[current.chapters.length - 1].order + 1
}

export async function replaceChaptersForStory(
  storyId: string,
  chapters: Omit<Chapter, 'storyId' | 'createdAt' | 'updatedAt'>[],
): Promise<Chapter[]> {
  const current = guestStories.get(storyId)
  if (!current) throw new Error('Story not found')
  const now = Date.now()
  const saved = chapters.map((chapter) => ({
    ...chapter,
    storyId,
    createdAt: now,
    updatedAt: now,
  }))
  saveGuestStory({
    ...current,
    chapters: saved,
    paragraphs: current.paragraphs.map((paragraph) => ({ ...paragraph, chapterId: null })),
  })
  return saved.sort((a, b) => a.order - b.order)
}

export async function reindexAllStories(): Promise<void> {
  for (const story of guestStories.values()) saveGuestStory(story)
}

export async function insertStoryFromDuplicate(input: {
  title: string
  language: Story['language']
  prompt: string
  genre: string
  folderId: string | null
  targetWordCount?: number
  creationMode?: BookCreationMode
  plannedChapterCount?: number
  storyBeginning?: string
  storyEnding?: string
  chapterWordTarget?: number
  readerAge?: number
  finishPercent?: number
  isBookFinished?: boolean
  characters: Omit<Character, 'id' | 'storyId'>[]
  chapters?: {
    sourceId: string
    title: string
    brief: string
    order: number
    targetWordCount: number
    isFinale: boolean
  }[]
  paragraphs: {
    content: string
    source: Paragraph['source']
    sourceChapterId?: string | null
  }[]
}): Promise<StoryWithDetails> {
  const story = await createStory({
    title: input.title,
    language: input.language,
    prompt: input.prompt,
    genre: input.genre,
    folderId: input.folderId,
    creationMode: input.creationMode,
    readerAge: input.readerAge,
  })
  const current = (await getStoryWithDetails(story.id))!
  const chapterIdMap = new Map<string, string>()
  const chapters: Chapter[] = (input.chapters ?? []).map((chapter) => {
    const id = generateId()
    chapterIdMap.set(chapter.sourceId, id)
    return {
      id,
      storyId: story.id,
      title: chapter.title,
      brief: chapter.brief,
      order: chapter.order,
      targetWordCount: chapter.targetWordCount,
      isFinale: chapter.isFinale,
      createdAt: current.createdAt,
      updatedAt: Date.now(),
    }
  })
  const paragraphs: Paragraph[] = input.paragraphs.map((paragraph, order) => ({
    id: generateId(),
    storyId: story.id,
    chapterId: paragraph.sourceChapterId
      ? (chapterIdMap.get(paragraph.sourceChapterId) ?? null)
      : null,
    order,
    content: paragraph.content,
    source: paragraph.source,
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  }))
  const characters: Character[] = input.characters.map((character) => ({
    id: generateId(),
    storyId: story.id,
    ...character,
  }))
  const details: StoryWithDetails = {
    ...current,
    targetWordCount: input.targetWordCount ?? current.targetWordCount,
    plannedChapterCount: input.plannedChapterCount ?? current.plannedChapterCount,
    storyBeginning: input.storyBeginning ?? '',
    storyEnding: input.storyEnding ?? '',
    chapterWordTarget: input.chapterWordTarget ?? current.chapterWordTarget,
    finishPercent: input.finishPercent ?? current.finishPercent,
    isBookFinished: input.isBookFinished ?? false,
    creationMode: chapters.length > 0 ? (input.creationMode ?? 'automatic') : 'legacy',
    characters,
    chapters,
    paragraphs,
  }
  saveGuestStory(details)
  return details
}

export async function applyStoryTranslation(
  _storyId: string,
  source: StoryWithDetails,
  translated: {
    title: string
    language: Story['language']
    prompt: string
    storyBeginning: string
    storyEnding: string
    characters: Omit<Character, 'id' | 'storyId'>[]
    chapters: { sourceId: string; title: string; brief: string }[]
    paragraphs: { sourceId: string; content: string }[]
  },
): Promise<StoryWithDetails> {
  const characters = source.characters.map((character, index) => ({
    ...character,
    ...(translated.characters[index] ?? {}),
  }))
  const chapters = source.chapters.map((chapter) => {
    const update = translated.chapters.find((item) => item.sourceId === chapter.id)
    return update ? { ...chapter, title: update.title, brief: update.brief } : chapter
  })
  const paragraphs = source.paragraphs.map((paragraph) => {
    const update = translated.paragraphs.find((item) => item.sourceId === paragraph.id)
    return update ? { ...paragraph, content: update.content } : paragraph
  })
  const next = {
    ...source,
    title: translated.title,
    language: translated.language,
    prompt: translated.prompt,
    storyBeginning: translated.storyBeginning,
    storyEnding: translated.storyEnding,
    characters,
    chapters,
    paragraphs,
  }
  saveGuestStory(next)
  return next
}

export function getGuestStorySnapshot(storyId: string): StoryWithDetails | null {
  return guestStories.get(storyId) ?? null
}
