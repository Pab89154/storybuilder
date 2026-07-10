import Dexie, { type EntityTable } from 'dexie'
import type { Character, Chapter, Folder, Paragraph, Story, StoryWithDetails, BookCreationMode } from '@/types/story'
import {
  DEFAULT_CHAPTER_WORDS,
  DEFAULT_FINISH_PERCENT,
  DEFAULT_PLANNED_CHAPTERS,
  DEFAULT_READER_AGE,
  DEFAULT_TARGET_WORD_COUNT,
  normalizeReaderAge,
} from '@/types/story'
import { buildSearchText } from '@/lib/search'
import { findPageForParagraph } from '@/lib/storyPagination'
import { generateId } from '@/lib/utils'

export class StoryBuilderDB extends Dexie {
  stories!: EntityTable<Story, 'id'>
  characters!: EntityTable<Character, 'id'>
  paragraphs!: EntityTable<Paragraph, 'id'>
  chapters!: EntityTable<Chapter, 'id'>
  folders!: EntityTable<Folder, 'id'>

  constructor() {
    super('StoryBuilderDB')
    this.version(1).stores({
      stories: 'id, updatedAt, createdAt, title',
      characters: 'id, storyId',
      paragraphs: 'id, storyId, [storyId+order]',
    })
    this.version(2)
      .stores({
        stories: 'id, updatedAt, createdAt, title',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, [storyId+order]',
      })
      .upgrade(async (tx) => {
        await tx.table('characters').toCollection().modify((char: Character) => {
          if (char.isHuman === undefined) char.isHuman = true
        })
      })
    this.version(3)
      .stores({
        stories: 'id, updatedAt, createdAt, title, folderId, genre',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, [storyId+order]',
        folders: 'id, order, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('stories').toCollection().modify((story: Story) => {
          if (story.genre === undefined) story.genre = ''
          if (story.folderId === undefined) story.folderId = null
          if (story.searchText === undefined) {
            story.searchText = [story.title, story.prompt, story.genre]
              .join(' ')
              .toLowerCase()
          }
        })
      })
    this.version(4)
      .stores({
        stories: 'id, updatedAt, createdAt, title, folderId, genre, sortOrder, [folderId+sortOrder]',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, [storyId+order]',
        folders: 'id, order, updatedAt',
      })
      .upgrade(async (tx) => {
        const allStories = (await tx.table('stories').toArray()) as Story[]
        const byFolder = new Map<string | null, Story[]>()

        for (const story of allStories) {
          const key = story.folderId ?? null
          const group = byFolder.get(key) ?? []
          group.push(story)
          byFolder.set(key, group)
        }

        for (const group of byFolder.values()) {
          group.sort((a, b) => b.updatedAt - a.updatedAt)
          for (let index = 0; index < group.length; index += 1) {
            await tx.table('stories').update(group[index].id, { sortOrder: index })
          }
        }
      })
    this.version(5)
      .stores({
        stories:
          'id, updatedAt, createdAt, title, folderId, genre, sortOrder, bookmarkParagraphId, [folderId+sortOrder]',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, [storyId+order]',
        folders: 'id, order, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('stories').toCollection().modify((story: Story & { bookmarkParagraphId?: string | null }) => {
          if (story.bookmarkParagraphId === undefined) story.bookmarkParagraphId = null
        })
      })
    this.version(6)
      .stores({
        stories:
          'id, updatedAt, createdAt, title, folderId, genre, sortOrder, bookmarkPageIndex, [folderId+sortOrder]',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, [storyId+order]',
        folders: 'id, order, updatedAt',
      })
      .upgrade(async (tx) => {
        const stories = await tx.table('stories').toArray() as Array<
          Story & { bookmarkParagraphId?: string | null }
        >
        const paragraphs = await tx.table('paragraphs').toArray() as Paragraph[]
        for (const story of stories) {
          if (story.bookmarkPageIndex === undefined) story.bookmarkPageIndex = null
          const legacyId = story.bookmarkParagraphId
          if (story.bookmarkPageIndex === null && legacyId) {
            const storyParagraphs = paragraphs
              .filter((paragraph) => paragraph.storyId === story.id)
              .sort((a, b) => a.order - b.order)
            story.bookmarkPageIndex = findPageForParagraph(
              storyParagraphs,
              legacyId,
              undefined,
              undefined,
            )
            story.bookmarkParagraphId = null
          }
          await tx.table('stories').put(story)
        }
      })
    this.version(7)
      .stores({
        stories:
          'id, updatedAt, createdAt, title, folderId, genre, sortOrder, bookmarkPageIndex, creationMode, [folderId+sortOrder]',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, chapterId, [storyId+order]',
        chapters: 'id, storyId, [storyId+order]',
        folders: 'id, order, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('stories').toCollection().modify((story: Story) => {
          if (story.creationMode === undefined) story.creationMode = 'legacy'
          if (story.plannedChapterCount === undefined) story.plannedChapterCount = DEFAULT_PLANNED_CHAPTERS
          if (story.storyBeginning === undefined) story.storyBeginning = ''
          if (story.storyEnding === undefined) story.storyEnding = ''
          if (story.chapterWordTarget === undefined) story.chapterWordTarget = DEFAULT_CHAPTER_WORDS
          if (story.finishPercent === undefined) story.finishPercent = DEFAULT_FINISH_PERCENT
          if (story.isBookFinished === undefined) story.isBookFinished = false
        })
        await tx.table('paragraphs').toCollection().modify((paragraph: Paragraph) => {
          if (paragraph.chapterId === undefined) paragraph.chapterId = null
        })
      })
    this.version(8)
      .stores({
        stories:
          'id, updatedAt, createdAt, title, folderId, genre, sortOrder, bookmarkPageIndex, creationMode, [folderId+sortOrder]',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, chapterId, [storyId+order]',
        chapters: 'id, storyId, [storyId+order]',
        folders: 'id, order, updatedAt',
      })
    this.version(9)
      .stores({
        stories:
          'id, updatedAt, createdAt, title, folderId, genre, sortOrder, bookmarkPageIndex, creationMode, [folderId+sortOrder]',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, chapterId, [storyId+order]',
        chapters: 'id, storyId, [storyId+order]',
        folders: 'id, order, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('stories').toCollection().modify((story: Story) => {
          if (story.readerAge === undefined) story.readerAge = DEFAULT_READER_AGE
        })
      })
    this.version(10)
      .stores({
        stories:
          'id, updatedAt, createdAt, title, folderId, genre, sortOrder, bookmarkPageIndex, creationMode, [folderId+sortOrder]',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, chapterId, [storyId+order]',
        chapters: 'id, storyId, [storyId+order]',
        folders: 'id, order, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('stories').toCollection().modify((story: Story) => {
          if (story.readerAge === 12) story.readerAge = 14
        })
      })
    this.version(11)
      .stores({
        stories:
          'id, updatedAt, createdAt, title, folderId, genre, sortOrder, bookmarkPageIndex, creationMode, [folderId+sortOrder]',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, chapterId, [storyId+order]',
        chapters: 'id, storyId, [storyId+order]',
        folders: 'id, order, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('stories').toCollection().modify((story: Story) => {
          if (story.readerAge === 10) story.readerAge = 9
        })
      })
    this.version(12)
      .stores({
        stories:
          'id, updatedAt, createdAt, title, folderId, genre, sortOrder, bookmarkPageIndex, creationMode, [folderId+sortOrder]',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, chapterId, [storyId+order]',
        chapters: 'id, storyId, [storyId+order]',
        folders: 'id, order, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('characters').toCollection().modify((char: Character) => {
          if (char.hasPet === undefined) char.hasPet = false
          if (char.petHasSuperpowers === undefined) char.petHasSuperpowers = false
          if (char.petName === undefined) char.petName = ''
          if (char.petSpecies === undefined) char.petSpecies = ''
          if (char.petSuperpowerDescription === undefined) char.petSuperpowerDescription = ''
          if (!char.hasPet) {
            char.petName = ''
            char.petSpecies = ''
            char.petHasSuperpowers = false
            char.petSuperpowerDescription = ''
          } else if (!char.petHasSuperpowers) {
            char.petSuperpowerDescription = ''
          }
        })
      })
    this.version(13)
      .stores({
        stories:
          'id, updatedAt, createdAt, title, folderId, genre, sortOrder, bookmarkPageIndex, creationMode, [folderId+sortOrder]',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, chapterId, [storyId+order]',
        chapters: 'id, storyId, [storyId+order]',
        folders: 'id, order, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('characters').toCollection().modify((char: Character) => {
          if (char.hasVehicle === undefined) char.hasVehicle = false
          if (char.vehicleType === undefined) char.vehicleType = ''
          if (char.vehicleColor === undefined) char.vehicleColor = ''
          if (char.vehicleSpeed === undefined) char.vehicleSpeed = ''
          if (!char.hasVehicle) {
            char.vehicleType = ''
            char.vehicleColor = ''
            char.vehicleSpeed = ''
          }
        })
      })
    this.version(14)
      .stores({
        stories:
          'id, updatedAt, createdAt, title, folderId, genre, sortOrder, bookmarkPageIndex, creationMode, [folderId+sortOrder]',
        characters: 'id, storyId',
        paragraphs: 'id, storyId, chapterId, [storyId+order]',
        chapters: 'id, storyId, [storyId+order]',
        folders: 'id, order, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('characters').toCollection().modify((char: Character) => {
          if (char.nickname === undefined) char.nickname = ''
        })
      })
  }
}

export const db = new StoryBuilderDB()

function storiesInFolder(folderId: string | null): Promise<Story[]> {
  return db.stories
    .filter((story) => (story.folderId ?? null) === folderId)
    .toArray()
}

async function getTopSortOrder(folderId: string | null): Promise<number> {
  const stories = await storiesInFolder(folderId)
  if (stories.length === 0) return 0
  return Math.min(...stories.map((story) => story.sortOrder ?? 0)) - 1
}

async function getNextSortOrder(folderId: string | null): Promise<number> {
  const stories = await storiesInFolder(folderId)
  if (stories.length === 0) return 0
  return Math.max(...stories.map((story) => story.sortOrder ?? 0)) + 1
}

export async function listStories(): Promise<Story[]> {
  const stories = await db.stories.toArray()
  return stories.sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function listFolders(): Promise<Folder[]> {
  return db.folders.orderBy('order').toArray()
}

export async function getStoryWithDetails(storyId: string) {
  const story = await db.stories.get(storyId)
  if (!story) return null

  const normalizedStory: Story = {
    ...story,
    readerAge: normalizeReaderAge(story.readerAge),
  }

  const [characters, chapters, paragraphs] = await Promise.all([
    db.characters.where('storyId').equals(storyId).toArray(),
    db.chapters.where('storyId').equals(storyId).sortBy('order'),
    db.paragraphs.where('storyId').equals(storyId).sortBy('order'),
  ])

  let bookmarkPageIndex = story.bookmarkPageIndex ?? null
  const legacyBookmarkParagraphId = (
    story as Story & { bookmarkParagraphId?: string | null }
  ).bookmarkParagraphId

  if (bookmarkPageIndex === null && legacyBookmarkParagraphId) {
    bookmarkPageIndex = findPageForParagraph(
      paragraphs,
      legacyBookmarkParagraphId,
      undefined,
      undefined,
      chapters,
    )
    await db.stories.update(storyId, {
      bookmarkPageIndex,
      bookmarkParagraphId: null,
    } as Partial<Story & { bookmarkParagraphId?: string | null }>)
  }

  if (bookmarkPageIndex !== null && bookmarkPageIndex < 0) {
    bookmarkPageIndex = null
    await db.stories.update(storyId, { bookmarkPageIndex })
  }

  return { ...normalizedStory, bookmarkPageIndex, characters, chapters, paragraphs }
}

export async function rebuildStorySearchIndex(storyId: string): Promise<void> {
  const story = await db.stories.get(storyId)
  if (!story) return

  const [characters, chapters, paragraphs] = await Promise.all([
    db.characters.where('storyId').equals(storyId).toArray(),
    db.chapters.where('storyId').equals(storyId).toArray(),
    db.paragraphs.where('storyId').equals(storyId).toArray(),
  ])

  const searchText = buildSearchText(story, characters, paragraphs, chapters)
  await db.stories.update(storyId, { searchText })
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
  const title = input.title ?? 'Untitled story'
  const folderId = input.folderId ?? null
  const sortOrder = await getTopSortOrder(folderId)
  const creationMode = input.creationMode ?? 'automatic'
  const story: Story = {
    id: generateId(),
    title,
    language: input.language,
    prompt: input.prompt ?? '',
    genre: input.genre ?? '',
    folderId,
    sortOrder,
    bookmarkPageIndex: null,
    searchText: [title, input.prompt ?? '', input.genre ?? ''].join(' ').toLowerCase(),
    targetWordCount: DEFAULT_TARGET_WORD_COUNT,
    creationMode,
    plannedChapterCount: DEFAULT_PLANNED_CHAPTERS,
    storyBeginning: '',
    storyEnding: '',
    chapterWordTarget: DEFAULT_CHAPTER_WORDS,
    readerAge: input.readerAge ?? DEFAULT_READER_AGE,
    finishPercent: DEFAULT_FINISH_PERCENT,
    isBookFinished: false,
    createdAt: now,
    updatedAt: now,
  }
  await db.stories.add(story)
  return story
}

export async function updateStory(
  storyId: string,
  updates: Partial<
    Pick<
      Story,
      | 'title'
      | 'language'
      | 'prompt'
      | 'targetWordCount'
      | 'genre'
      | 'folderId'
      | 'bookmarkPageIndex'
      | 'creationMode'
      | 'plannedChapterCount'
      | 'storyBeginning'
      | 'storyEnding'
      | 'chapterWordTarget'
      | 'readerAge'
      | 'finishPercent'
      | 'isBookFinished'
    >
  >,
): Promise<void> {
  await db.stories.update(storyId, { ...updates, updatedAt: Date.now() })
  await rebuildStorySearchIndex(storyId)
}

export async function setStoryBookmarkPage(
  storyId: string,
  bookmarkPageIndex: number | null,
): Promise<void> {
  await db.stories.update(storyId, { bookmarkPageIndex, updatedAt: Date.now() })
}

export async function moveStoryToFolder(
  storyId: string,
  folderId: string | null,
): Promise<void> {
  const sortOrder = await getNextSortOrder(folderId)
  await db.stories.update(storyId, { folderId, sortOrder, updatedAt: Date.now() })
}

export async function moveStoryToPosition(
  storyId: string,
  targetFolderId: string | null,
  targetIndex: number,
): Promise<void> {
  const story = await db.stories.get(storyId)
  if (!story) return

  const sourceFolderId = story.folderId ?? null
  const sourceStories = (await storiesInFolder(sourceFolderId))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((item) => item.id !== storyId)

  let targetStories =
    sourceFolderId === targetFolderId
      ? sourceStories
      : (await storiesInFolder(targetFolderId))
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .filter((item) => item.id !== storyId)

  const clampedIndex = Math.max(0, Math.min(targetIndex, targetStories.length))
  targetStories = [...targetStories]
  targetStories.splice(clampedIndex, 0, story)

  await db.transaction('rw', db.stories, async () => {
    if (sourceFolderId !== targetFolderId) {
      for (let index = 0; index < sourceStories.length; index += 1) {
        await db.stories.update(sourceStories[index].id, { sortOrder: index })
      }
    }

    for (let index = 0; index < targetStories.length; index += 1) {
      const item = targetStories[index]
      if (item.id === storyId) {
        await db.stories.update(storyId, {
          folderId: targetFolderId,
          sortOrder: index,
          updatedAt: Date.now(),
        })
      } else {
        await db.stories.update(item.id, { sortOrder: index })
      }
    }
  })
}

export async function reorderStoriesInFolder(
  _folderId: string | null,
  orderedStoryIds: string[],
): Promise<void> {
  await db.transaction('rw', db.stories, async () => {
    for (let index = 0; index < orderedStoryIds.length; index += 1) {
      await db.stories.update(orderedStoryIds[index], { sortOrder: index })
    }
  })
}

export async function deleteStory(storyId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.stories, db.characters, db.paragraphs, db.chapters],
    async () => {
    await db.stories.delete(storyId)
    await db.characters.where('storyId').equals(storyId).delete()
    await db.paragraphs.where('storyId').equals(storyId).delete()
    await db.chapters.where('storyId').equals(storyId).delete()
    },
  )
}

export async function createFolder(name: string): Promise<Folder> {
  const folders = await listFolders()
  const now = Date.now()
  const folder: Folder = {
    id: generateId(),
    name: name.trim() || 'New collection',
    order: folders.length,
    createdAt: now,
    updatedAt: now,
  }
  await db.folders.add(folder)
  return folder
}

export async function updateFolder(
  folderId: string,
  updates: Partial<Pick<Folder, 'name' | 'order'>>,
): Promise<void> {
  await db.folders.update(folderId, { ...updates, updatedAt: Date.now() })
}

export async function deleteFolder(folderId: string): Promise<void> {
  await db.transaction('rw', db.stories, db.folders, async () => {
    await db.stories.where('folderId').equals(folderId).modify({ folderId: null })
    await db.folders.delete(folderId)
  })
}

export async function addCharacter(
  storyId: string,
  data: Omit<Character, 'id' | 'storyId'>,
): Promise<Character> {
  const character: Character = { id: generateId(), storyId, ...data }
  await db.characters.add(character)
  await touchStory(storyId)
  return character
}

export async function updateCharacter(
  characterId: string,
  updates: Partial<Omit<Character, 'id' | 'storyId'>>,
): Promise<void> {
  const character = await db.characters.get(characterId)
  if (!character) return
  const normalized =
    'species' in updates && updates.species === ''
      ? { ...updates, species: undefined }
      : updates
  const withCharacterCleanup = { ...normalized }
  if ('hasPet' in withCharacterCleanup && !withCharacterCleanup.hasPet) {
    withCharacterCleanup.petName = ''
    withCharacterCleanup.petSpecies = ''
    withCharacterCleanup.petHasSuperpowers = false
    withCharacterCleanup.petSuperpowerDescription = ''
  }
  if ('petHasSuperpowers' in withCharacterCleanup && !withCharacterCleanup.petHasSuperpowers) {
    withCharacterCleanup.petSuperpowerDescription = ''
  }
  if ('hasVehicle' in withCharacterCleanup && !withCharacterCleanup.hasVehicle) {
    withCharacterCleanup.vehicleType = ''
    withCharacterCleanup.vehicleColor = ''
    withCharacterCleanup.vehicleSpeed = ''
  }
  await db.characters.update(characterId, withCharacterCleanup)
  await touchStory(character.storyId)
}

export async function deleteCharacter(characterId: string): Promise<void> {
  const character = await db.characters.get(characterId)
  if (!character) return
  await db.characters.delete(characterId)
  await touchStory(character.storyId)
}

export async function addParagraph(
  storyId: string,
  data: Pick<Paragraph, 'content' | 'source' | 'order' | 'chapterId'>,
): Promise<Paragraph> {
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
  await db.paragraphs.add(paragraph)
  await touchStory(storyId)
  return paragraph
}

export async function updateParagraph(
  paragraphId: string,
  updates: Partial<Pick<Paragraph, 'content' | 'source' | 'order'>>,
): Promise<void> {
  const paragraph = await db.paragraphs.get(paragraphId)
  if (!paragraph) return
  await db.paragraphs.update(paragraphId, { ...updates, updatedAt: Date.now() })
  await touchStory(paragraph.storyId)
}

export async function deleteParagraph(paragraphId: string): Promise<void> {
  const paragraph = await db.paragraphs.get(paragraphId)
  if (!paragraph) return

  await db.paragraphs.delete(paragraphId)
  await touchStory(paragraph.storyId)
}

export async function replaceParagraphContent(
  paragraphId: string,
  content: string,
  source: Paragraph['source'] = 'ai',
): Promise<void> {
  await updateParagraph(paragraphId, { content, source })
}

async function touchStory(storyId: string): Promise<void> {
  await db.stories.update(storyId, { updatedAt: Date.now() })
  await rebuildStorySearchIndex(storyId)
}

export async function getNextParagraphOrder(storyId: string): Promise<number> {
  const paragraphs = await db.paragraphs.where('storyId').equals(storyId).sortBy('order')
  if (paragraphs.length === 0) return 0
  return paragraphs[paragraphs.length - 1].order + 1
}

export async function addChapter(
  storyId: string,
  data: Pick<Chapter, 'title' | 'brief' | 'order' | 'targetWordCount' | 'isFinale'>,
): Promise<Chapter> {
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
  await db.chapters.add(chapter)
  await touchStory(storyId)
  return chapter
}

export async function updateChapter(
  chapterId: string,
  updates: Partial<Pick<Chapter, 'title' | 'brief' | 'targetWordCount' | 'order' | 'isFinale'>>,
): Promise<void> {
  const chapter = await db.chapters.get(chapterId)
  if (!chapter) return
  await db.chapters.update(chapterId, { ...updates, updatedAt: Date.now() })
  await touchStory(chapter.storyId)
}

export async function deleteChaptersForStory(storyId: string): Promise<void> {
  await db.chapters.where('storyId').equals(storyId).delete()
  await touchStory(storyId)
}

export async function getNextChapterOrder(storyId: string): Promise<number> {
  const chapters = await db.chapters.where('storyId').equals(storyId).sortBy('order')
  if (chapters.length === 0) return 0
  return chapters[chapters.length - 1].order + 1
}

export async function replaceChaptersForStory(
  storyId: string,
  chapters: Omit<Chapter, 'storyId' | 'createdAt' | 'updatedAt'>[],
): Promise<Chapter[]> {
  const now = Date.now()
  const saved: Chapter[] = []

  await db.transaction('rw', db.chapters, db.paragraphs, async () => {
    const existingChapterCount = await db.chapters.where('storyId').equals(storyId).count()
    if (existingChapterCount > 0) {
      await db.paragraphs
        .where('storyId')
        .equals(storyId)
        .modify((paragraph) => {
          paragraph.chapterId = null
        })
    }
    await db.chapters.where('storyId').equals(storyId).delete()
    for (const chapter of chapters) {
      const record: Chapter = {
        ...chapter,
        storyId,
        createdAt: now,
        updatedAt: now,
      }
      await db.chapters.add(record)
      saved.push(record)
    }
  })

  await touchStory(storyId)
  return saved.sort((a, b) => a.order - b.order)
}

export async function reindexAllStories(): Promise<void> {
  const stories = await listStories()
  await Promise.all(stories.map((s) => rebuildStorySearchIndex(s.id)))
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
  const now = Date.now()
  const storyId = generateId()
  const sortOrder = await getTopSortOrder(input.folderId)
  const hasChapters = (input.chapters?.length ?? 0) > 0

  const story: Story = {
    id: storyId,
    title: input.title,
    language: input.language,
    prompt: input.prompt,
    genre: input.genre,
    folderId: input.folderId,
    sortOrder,
    bookmarkPageIndex: null,
    searchText: '',
    targetWordCount: input.targetWordCount ?? DEFAULT_TARGET_WORD_COUNT,
    creationMode: hasChapters ? (input.creationMode ?? 'automatic') : 'legacy',
    plannedChapterCount: input.plannedChapterCount ?? DEFAULT_PLANNED_CHAPTERS,
    storyBeginning: input.storyBeginning ?? '',
    storyEnding: input.storyEnding ?? '',
    chapterWordTarget: input.chapterWordTarget ?? DEFAULT_CHAPTER_WORDS,
    readerAge: input.readerAge ?? DEFAULT_READER_AGE,
    finishPercent: input.finishPercent ?? DEFAULT_FINISH_PERCENT,
    isBookFinished: input.isBookFinished ?? false,
    createdAt: now,
    updatedAt: now,
  }

  const chapterIdMap = new Map<string, string>()

  await db.transaction('rw', db.stories, db.characters, db.paragraphs, db.chapters, async () => {
    await db.stories.add(story)

    for (const char of input.characters) {
      await db.characters.add({ id: generateId(), storyId, ...char })
    }

    if (input.chapters?.length) {
      for (const chapter of input.chapters) {
        const newChapterId = generateId()
        chapterIdMap.set(chapter.sourceId, newChapterId)
        await db.chapters.add({
          id: newChapterId,
          storyId,
          title: chapter.title,
          brief: chapter.brief,
          order: chapter.order,
          targetWordCount: chapter.targetWordCount,
          isFinale: chapter.isFinale,
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    for (let order = 0; order < input.paragraphs.length; order += 1) {
      const paragraph = input.paragraphs[order]
      const sourceChapterId = paragraph.sourceChapterId ?? null
      const chapterId = sourceChapterId ? (chapterIdMap.get(sourceChapterId) ?? null) : null
      await db.paragraphs.add({
        id: generateId(),
        storyId,
        chapterId,
        order,
        content: paragraph.content,
        source: paragraph.source,
        createdAt: now,
        updatedAt: now,
      })
    }
  })

  await rebuildStorySearchIndex(storyId)
  const details = await getStoryWithDetails(storyId)
  if (!details) throw new Error('Failed to create duplicated story')
  return details
}

export async function applyStoryTranslation(
  storyId: string,
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
  const now = Date.now()

  await db.transaction('rw', db.stories, db.characters, db.paragraphs, db.chapters, async () => {
    await db.stories.update(storyId, {
      title: translated.title,
      language: translated.language,
      prompt: translated.prompt,
      storyBeginning: translated.storyBeginning,
      storyEnding: translated.storyEnding,
      updatedAt: now,
    })

    for (let index = 0; index < source.characters.length; index += 1) {
      const character = source.characters[index]
      const updates = translated.characters[index]
      if (!character || !updates) continue
      await db.characters.update(character.id, updates)
    }

    for (const chapter of translated.chapters) {
      await db.chapters.update(chapter.sourceId, {
        title: chapter.title,
        brief: chapter.brief,
        updatedAt: now,
      })
    }

    for (const paragraph of translated.paragraphs) {
      await db.paragraphs.update(paragraph.sourceId, {
        content: paragraph.content,
        updatedAt: now,
      })
    }
  })

  await rebuildStorySearchIndex(storyId)
  const details = await getStoryWithDetails(storyId)
  if (!details) throw new Error('Failed to apply story translation')
  return details
}
