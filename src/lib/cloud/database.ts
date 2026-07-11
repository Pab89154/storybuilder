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
  normalizeReaderAge,
} from '@/types/story'
import { buildSearchText } from '@/lib/search'
import { findPageForParagraph } from '@/lib/storyPagination'
import { generateId } from '@/lib/utils'
import { decryptStoryPayload, encryptStoryPayload } from '@/lib/cloud/encryptionKeys'
import { syncActiveSharesForStory } from '@/lib/cloud/sharing'
import { supabase } from '@/lib/supabase/client'

type StoryEncryptedPayload = {
  title: string
  language: Story['language']
  prompt: string
  genre: string
  bookmarkPageIndex: number | null
  searchText: string
  targetWordCount: number
  creationMode: BookCreationMode
  plannedChapterCount: number
  storyBeginning: string
  storyEnding: string
  chapterWordTarget: number
  readerAge: number
  finishPercent: number
  isBookFinished: boolean
  characters: Character[]
  chapters: Chapter[]
  paragraphs: Paragraph[]
}

type FolderEncryptedPayload = {
  name: string
}

type StoryRow = {
  id: string
  user_id: string
  folder_id: string | null
  encrypted_payload: string
  sort_order: number
  is_shared: boolean
  created_at: string
  updated_at: string
}

type FolderRow = {
  id: string
  user_id: string
  encrypted_payload: string
  sort_order: number
  created_at: string
  updated_at: string
}

function rowToStory(row: StoryRow, payload: StoryEncryptedPayload): Story {
  return {
    id: row.id,
    title: payload.title,
    language: payload.language,
    prompt: payload.prompt,
    genre: payload.genre,
    folderId: row.folder_id,
    sortOrder: row.sort_order,
    bookmarkPageIndex: payload.bookmarkPageIndex,
    searchText: payload.searchText,
    targetWordCount: payload.targetWordCount,
    creationMode: payload.creationMode,
    plannedChapterCount: payload.plannedChapterCount,
    storyBeginning: payload.storyBeginning,
    storyEnding: payload.storyEnding,
    chapterWordTarget: payload.chapterWordTarget,
    readerAge: normalizeReaderAge(payload.readerAge),
    finishPercent: payload.finishPercent,
    isBookFinished: payload.isBookFinished,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    isShared: row.is_shared,
  }
}

function storyToPayload(story: StoryWithDetails): StoryEncryptedPayload {
  const { characters, chapters, paragraphs, ...meta } = story
  return {
    title: meta.title,
    language: meta.language,
    prompt: meta.prompt,
    genre: meta.genre,
    bookmarkPageIndex: meta.bookmarkPageIndex,
    searchText: meta.searchText,
    targetWordCount: meta.targetWordCount,
    creationMode: meta.creationMode,
    plannedChapterCount: meta.plannedChapterCount,
    storyBeginning: meta.storyBeginning,
    storyEnding: meta.storyEnding,
    chapterWordTarget: meta.chapterWordTarget,
    readerAge: meta.readerAge,
    finishPercent: meta.finishPercent,
    isBookFinished: meta.isBookFinished,
    characters,
    chapters,
    paragraphs,
  }
}

async function loadStoryPayload(row: StoryRow): Promise<StoryEncryptedPayload> {
  return decryptStoryPayload<StoryEncryptedPayload>(row.encrypted_payload)
}

async function saveStoryRow(
  storyId: string,
  details: StoryWithDetails,
  options?: { isShared?: boolean; folderId?: string | null },
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const searchText = buildSearchText(
    details,
    details.characters,
    details.paragraphs,
    details.chapters,
  )
  const payload = storyToPayload({ ...details, searchText })
  const encrypted_payload = await encryptStoryPayload(payload)

  const { error } = await supabase
    .from('stories')
    .update({
      encrypted_payload,
      folder_id: options?.folderId ?? details.folderId,
      is_shared: options?.isShared ?? details.isShared ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storyId)
    .eq('user_id', user.id)
  if (error) throw error

  if (details.isShared) {
    await syncActiveSharesForStory(storyId)
  }
}

async function storiesInFolder(folderId: string | null): Promise<Story[]> {
  const stories = await listStories()
  return stories.filter((story) => (story.folderId ?? null) === folderId)
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
  if (error) throw error

  const stories: Story[] = []
  for (const row of (data ?? []) as StoryRow[]) {
    const payload = await loadStoryPayload(row)
    stories.push(rowToStory(row, payload))
  }
  return stories
}

export async function listFolders(): Promise<Folder[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
  if (error) throw error

  const folders: Folder[] = []
  for (const row of (data ?? []) as FolderRow[]) {
    const payload = await decryptStoryPayload<FolderEncryptedPayload>(row.encrypted_payload)
    folders.push({
      id: row.id,
      name: payload.name,
      order: row.sort_order,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    })
  }
  return folders
}

export async function getStoryWithDetails(storyId: string): Promise<StoryWithDetails | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const row = data as StoryRow
  const payload = await loadStoryPayload(row)
  const story = rowToStory(row, payload)
  return {
    ...story,
    characters: payload.characters,
    chapters: payload.chapters,
    paragraphs: payload.paragraphs,
  }
}

export async function rebuildStorySearchIndex(storyId: string): Promise<void> {
  const details = await getStoryWithDetails(storyId)
  if (!details) return
  await saveStoryRow(storyId, details)
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = Date.now()
  const title = input.title ?? 'Untitled story'
  const folderId = input.folderId ?? null
  const sortOrder = await getTopSortOrder(folderId)
  const creationMode = input.creationMode ?? 'automatic'
  const storyId = generateId()

  const story: StoryWithDetails = {
    id: storyId,
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
    characters: [],
    chapters: [],
    paragraphs: [],
  }

  const encrypted_payload = await encryptStoryPayload(storyToPayload(story))
  const { error } = await supabase.from('stories').insert({
    id: storyId,
    user_id: user.id,
    folder_id: folderId,
    encrypted_payload,
    sort_order: sortOrder,
    is_shared: false,
  })
  if (error) throw error
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
      | 'isShared'
      | 'sortOrder'
    >
  >,
): Promise<void> {
  const details = await getStoryWithDetails(storyId)
  if (!details) return
  const next = { ...details, ...updates, updatedAt: Date.now() }
  await saveStoryRow(storyId, next, {
    isShared: updates.isShared,
    folderId: updates.folderId,
  })
}

export async function setStoryBookmarkPage(
  storyId: string,
  bookmarkPageIndex: number | null,
): Promise<void> {
  await updateStory(storyId, { bookmarkPageIndex })
}

export async function moveStoryToFolder(storyId: string, folderId: string | null): Promise<void> {
  const sortOrder = await getNextSortOrder(folderId)
  const details = await getStoryWithDetails(storyId)
  if (!details) return
  await saveStoryRow(storyId, { ...details, folderId, sortOrder, updatedAt: Date.now() }, {
    folderId,
  })
}

export async function moveStoryToPosition(
  storyId: string,
  targetFolderId: string | null,
  targetIndex: number,
): Promise<void> {
  const stories = await listStories()
  const story = stories.find((item) => item.id === storyId)
  if (!story) return

  const sourceFolderId = story.folderId ?? null
  const sourceStories = stories
    .filter((item) => (item.folderId ?? null) === sourceFolderId && item.id !== storyId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  let targetStories =
    sourceFolderId === targetFolderId
      ? sourceStories
      : stories
          .filter((item) => (item.folderId ?? null) === targetFolderId && item.id !== storyId)
          .sort((a, b) => a.sortOrder - b.sortOrder)

  const clampedIndex = Math.max(0, Math.min(targetIndex, targetStories.length))
  targetStories = [...targetStories]
  targetStories.splice(clampedIndex, 0, { ...story, folderId: targetFolderId })

  for (let index = 0; index < sourceStories.length; index += 1) {
    if (sourceFolderId !== targetFolderId) {
      await updateStory(sourceStories[index].id, { sortOrder: index })
    }
  }

  for (let index = 0; index < targetStories.length; index += 1) {
    const item = targetStories[index]
    if (item.id === storyId) {
      await moveStoryToFolder(storyId, targetFolderId)
      await updateStory(storyId, { sortOrder: index })
    } else {
      await updateStory(item.id, { sortOrder: index })
    }
  }
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('stories').delete().eq('id', storyId).eq('user_id', user.id)
  if (error) throw error
}

export async function createFolder(name: string): Promise<Folder> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const folders = await listFolders()
  const now = Date.now()
  const folderId = generateId()
  const payload: FolderEncryptedPayload = { name: name.trim() || 'New collection' }
  const encrypted_payload = await encryptStoryPayload(payload)

  const { error } = await supabase.from('folders').insert({
    id: folderId,
    user_id: user.id,
    encrypted_payload,
    sort_order: folders.length,
  })
  if (error) throw error

  return {
    id: folderId,
    name: payload.name,
    order: folders.length,
    createdAt: now,
    updatedAt: now,
  }
}

export async function updateFolder(
  folderId: string,
  updates: Partial<Pick<Folder, 'name' | 'order'>>,
): Promise<void> {
  const folders = await listFolders()
  const folder = folders.find((item) => item.id === folderId)
  if (!folder) return

  const payload: FolderEncryptedPayload = {
    name: updates.name?.trim() || folder.name,
  }
  const encrypted_payload = await encryptStoryPayload(payload)
  const { error } = await supabase
    .from('folders')
    .update({
      encrypted_payload,
      sort_order: updates.order ?? folder.order,
      updated_at: new Date().toISOString(),
    })
    .eq('id', folderId)
  if (error) throw error
}

export async function deleteFolder(folderId: string): Promise<void> {
  const stories = await listStories()
  for (const story of stories.filter((item) => item.folderId === folderId)) {
    await moveStoryToFolder(story.id, null)
  }
  const { error } = await supabase.from('folders').delete().eq('id', folderId)
  if (error) throw error
}

async function mutateStoryDetails(
  storyId: string,
  mutate: (details: StoryWithDetails) => StoryWithDetails,
): Promise<void> {
  const details = await getStoryWithDetails(storyId)
  if (!details) return
  const next = mutate({ ...details, updatedAt: Date.now() })
  await saveStoryRow(storyId, next)
}

export async function addCharacter(
  storyId: string,
  data: Omit<Character, 'id' | 'storyId'>,
): Promise<Character> {
  const character: Character = { id: generateId(), storyId, ...data }
  await mutateStoryDetails(storyId, (details) => ({
    ...details,
    characters: [...details.characters, character],
  }))
  return character
}

export async function updateCharacter(
  characterId: string,
  updates: Partial<Omit<Character, 'id' | 'storyId'>>,
): Promise<void> {
  const stories = await listStories()
  for (const story of stories) {
    const details = await getStoryWithDetails(story.id)
    if (!details?.characters.some((character) => character.id === characterId)) continue
    await mutateStoryDetails(story.id, (current) => ({
      ...current,
      characters: current.characters.map((character) =>
        character.id === characterId ? { ...character, ...updates } : character,
      ),
    }))
    return
  }
}

export async function deleteCharacter(characterId: string): Promise<void> {
  const stories = await listStories()
  for (const story of stories) {
    const details = await getStoryWithDetails(story.id)
    if (!details?.characters.some((character) => character.id === characterId)) continue
    await mutateStoryDetails(story.id, (current) => ({
      ...current,
      characters: current.characters.filter((character) => character.id !== characterId),
    }))
    return
  }
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
  await mutateStoryDetails(storyId, (details) => ({
    ...details,
    paragraphs: [...details.paragraphs, paragraph],
  }))
  return paragraph
}

export async function updateParagraph(
  paragraphId: string,
  updates: Partial<Pick<Paragraph, 'content' | 'source' | 'order'>>,
): Promise<void> {
  const stories = await listStories()
  for (const story of stories) {
    const details = await getStoryWithDetails(story.id)
    if (!details?.paragraphs.some((paragraph) => paragraph.id === paragraphId)) continue
    await mutateStoryDetails(story.id, (current) => ({
      ...current,
      paragraphs: current.paragraphs.map((paragraph) =>
        paragraph.id === paragraphId
          ? { ...paragraph, ...updates, updatedAt: Date.now() }
          : paragraph,
      ),
    }))
    return
  }
}

export async function deleteParagraph(paragraphId: string): Promise<void> {
  const stories = await listStories()
  for (const story of stories) {
    const details = await getStoryWithDetails(story.id)
    if (!details?.paragraphs.some((paragraph) => paragraph.id === paragraphId)) continue
    await mutateStoryDetails(story.id, (current) => ({
      ...current,
      paragraphs: current.paragraphs.filter((paragraph) => paragraph.id !== paragraphId),
    }))
    return
  }
}

export async function resetBookForRegeneration(
  storyId: string,
  options: { clearChapters: boolean },
): Promise<void> {
  await mutateStoryDetails(storyId, (details) => ({
    ...details,
    paragraphs: [],
    chapters: options.clearChapters ? [] : details.chapters,
    isBookFinished: false,
    bookmarkPageIndex: null,
  }))
}

export async function replaceParagraphContent(
  paragraphId: string,
  content: string,
  source: Paragraph['source'] = 'ai',
): Promise<void> {
  await updateParagraph(paragraphId, { content, source })
}

export async function getNextParagraphOrder(storyId: string): Promise<number> {
  const details = await getStoryWithDetails(storyId)
  if (!details || details.paragraphs.length === 0) return 0
  return details.paragraphs[details.paragraphs.length - 1].order + 1
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
  await mutateStoryDetails(storyId, (details) => ({
    ...details,
    chapters: [...details.chapters, chapter],
  }))
  return chapter
}

export async function updateChapter(
  chapterId: string,
  updates: Partial<Pick<Chapter, 'title' | 'brief' | 'targetWordCount' | 'order' | 'isFinale'>>,
): Promise<void> {
  const stories = await listStories()
  for (const story of stories) {
    const details = await getStoryWithDetails(story.id)
    if (!details?.chapters.some((chapter) => chapter.id === chapterId)) continue
    await mutateStoryDetails(story.id, (current) => ({
      ...current,
      chapters: current.chapters.map((chapter) =>
        chapter.id === chapterId ? { ...chapter, ...updates, updatedAt: Date.now() } : chapter,
      ),
    }))
    return
  }
}

export async function deleteChaptersForStory(storyId: string): Promise<void> {
  await mutateStoryDetails(storyId, (details) => ({ ...details, chapters: [] }))
}

export async function getNextChapterOrder(storyId: string): Promise<number> {
  const details = await getStoryWithDetails(storyId)
  if (!details || details.chapters.length === 0) return 0
  return details.chapters[details.chapters.length - 1].order + 1
}

export async function replaceChaptersForStory(
  storyId: string,
  chapters: Omit<Chapter, 'storyId' | 'createdAt' | 'updatedAt'>[],
): Promise<Chapter[]> {
  const now = Date.now()
  const saved = chapters.map((chapter) => ({
    ...chapter,
    storyId,
    createdAt: now,
    updatedAt: now,
  }))
  await mutateStoryDetails(storyId, (details) => ({
    ...details,
    chapters: saved,
    paragraphs: details.paragraphs.map((paragraph) => ({ ...paragraph, chapterId: null })),
  }))
  return saved.sort((a, b) => a.order - b.order)
}

export async function reindexAllStories(): Promise<void> {
  const stories = await listStories()
  await Promise.all(stories.map((story) => rebuildStorySearchIndex(story.id)))
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
  const chapterIdMap = new Map<string, string>()
  const chapters: Chapter[] = (input.chapters ?? []).map((chapter) => {
    const id = generateId()
    chapterIdMap.set(chapter.sourceId, id)
    return {
      id,
      storyId,
      title: chapter.title,
      brief: chapter.brief,
      order: chapter.order,
      targetWordCount: chapter.targetWordCount,
      isFinale: chapter.isFinale,
      createdAt: now,
      updatedAt: now,
    }
  })

  const paragraphs: Paragraph[] = input.paragraphs.map((paragraph, order) => ({
    id: generateId(),
    storyId,
    chapterId: paragraph.sourceChapterId
      ? (chapterIdMap.get(paragraph.sourceChapterId) ?? null)
      : null,
    order,
    content: paragraph.content,
    source: paragraph.source,
    createdAt: now,
    updatedAt: now,
  }))

  const characters: Character[] = input.characters.map((character) => ({
    id: generateId(),
    storyId,
    ...character,
  }))

  const story: StoryWithDetails = {
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
    creationMode: chapters.length > 0 ? (input.creationMode ?? 'automatic') : 'legacy',
    plannedChapterCount: input.plannedChapterCount ?? DEFAULT_PLANNED_CHAPTERS,
    storyBeginning: input.storyBeginning ?? '',
    storyEnding: input.storyEnding ?? '',
    chapterWordTarget: input.chapterWordTarget ?? DEFAULT_CHAPTER_WORDS,
    readerAge: input.readerAge ?? DEFAULT_READER_AGE,
    finishPercent: input.finishPercent ?? DEFAULT_FINISH_PERCENT,
    isBookFinished: input.isBookFinished ?? false,
    createdAt: now,
    updatedAt: now,
    characters,
    chapters,
    paragraphs,
  }

  story.searchText = buildSearchText(story, characters, paragraphs, chapters)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const encrypted_payload = await encryptStoryPayload(storyToPayload(story))
  const { error } = await supabase.from('stories').insert({
    id: storyId,
    user_id: user.id,
    folder_id: input.folderId,
    encrypted_payload,
    sort_order: sortOrder,
    is_shared: false,
  })
  if (error) throw error
  return story
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

  const next: StoryWithDetails = {
    ...source,
    title: translated.title,
    language: translated.language,
    prompt: translated.prompt,
    storyBeginning: translated.storyBeginning,
    storyEnding: translated.storyEnding,
    characters,
    chapters,
    paragraphs,
    updatedAt: Date.now(),
  }
  next.searchText = buildSearchText(next, characters, paragraphs, chapters)
  await saveStoryRow(storyId, next)
  return next
}

export async function persistActiveStory(details: StoryWithDetails): Promise<void> {
  await saveStoryRow(details.id, details)
}

export async function getStoryWithDetailsFromPayload(
  row: StoryRow,
): Promise<StoryWithDetails | null> {
  try {
    const payload = await loadStoryPayload(row)
    const story = rowToStory(row, payload)
    return {
      ...story,
      characters: payload.characters,
      chapters: payload.chapters,
      paragraphs: payload.paragraphs,
    }
  } catch {
    return null
  }
}

export async function fixBookmarkPage(storyId: string): Promise<void> {
  const details = await getStoryWithDetails(storyId)
  if (!details) return
  let bookmarkPageIndex = details.bookmarkPageIndex
  if (bookmarkPageIndex !== null && bookmarkPageIndex < 0) {
    bookmarkPageIndex = null
  }
  if (bookmarkPageIndex === null) return
  const computed = findPageForParagraph(
    details.paragraphs,
    details.paragraphs[0]?.id ?? '',
    undefined,
    undefined,
    details.chapters,
  )
  if (computed !== bookmarkPageIndex) {
    await updateStory(storyId, { bookmarkPageIndex: computed })
  }
}
