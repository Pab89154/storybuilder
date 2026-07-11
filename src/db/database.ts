import { getStoryRepository, type AuthMode } from '@/lib/repository'

let currentAuthMode: AuthMode = 'guest'

export function setDatabaseAuthMode(mode: AuthMode): void {
  currentAuthMode = mode
}

export function getDatabaseAuthMode(): AuthMode {
  return currentAuthMode
}

async function repo() {
  return getStoryRepository(currentAuthMode)
}

export async function listStories() {
  return (await repo()).listStories()
}

export async function listFolders() {
  return (await repo()).listFolders()
}

export async function getStoryWithDetails(storyId: string) {
  return (await repo()).getStoryWithDetails(storyId)
}

export async function rebuildStorySearchIndex(storyId: string) {
  return (await repo()).rebuildStorySearchIndex(storyId)
}

export async function createStory(
  input: Parameters<Awaited<ReturnType<typeof repo>>['createStory']>[0],
) {
  return (await repo()).createStory(input)
}

export async function updateStory(
  storyId: string,
  updates: Parameters<Awaited<ReturnType<typeof repo>>['updateStory']>[1],
) {
  return (await repo()).updateStory(storyId, updates)
}

export async function setStoryBookmarkPage(storyId: string, bookmarkPageIndex: number | null) {
  return (await repo()).setStoryBookmarkPage(storyId, bookmarkPageIndex)
}

export async function moveStoryToFolder(storyId: string, folderId: string | null) {
  return (await repo()).moveStoryToFolder(storyId, folderId)
}

export async function moveStoryToPosition(
  storyId: string,
  targetFolderId: string | null,
  targetIndex: number,
) {
  return (await repo()).moveStoryToPosition(storyId, targetFolderId, targetIndex)
}

export async function reorderStoriesInFolder(
  folderId: string | null,
  orderedStoryIds: string[],
) {
  return (await repo()).reorderStoriesInFolder(folderId, orderedStoryIds)
}

export async function deleteStory(storyId: string) {
  return (await repo()).deleteStory(storyId)
}

export async function createFolder(name: string) {
  return (await repo()).createFolder(name)
}

export async function updateFolder(
  folderId: string,
  updates: Parameters<Awaited<ReturnType<typeof repo>>['updateFolder']>[1],
) {
  return (await repo()).updateFolder(folderId, updates)
}

export async function deleteFolder(folderId: string) {
  return (await repo()).deleteFolder(folderId)
}

export async function addCharacter(
  storyId: string,
  data: Parameters<Awaited<ReturnType<typeof repo>>['addCharacter']>[1],
) {
  return (await repo()).addCharacter(storyId, data)
}

export async function updateCharacter(
  characterId: string,
  updates: Parameters<Awaited<ReturnType<typeof repo>>['updateCharacter']>[1],
) {
  return (await repo()).updateCharacter(characterId, updates)
}

export async function deleteCharacter(characterId: string) {
  return (await repo()).deleteCharacter(characterId)
}

export async function addParagraph(
  storyId: string,
  data: Parameters<Awaited<ReturnType<typeof repo>>['addParagraph']>[1],
) {
  return (await repo()).addParagraph(storyId, data)
}

export async function updateParagraph(
  paragraphId: string,
  updates: Parameters<Awaited<ReturnType<typeof repo>>['updateParagraph']>[1],
) {
  return (await repo()).updateParagraph(paragraphId, updates)
}

export async function deleteParagraph(paragraphId: string) {
  return (await repo()).deleteParagraph(paragraphId)
}

export async function resetBookForRegeneration(
  storyId: string,
  options: Parameters<Awaited<ReturnType<typeof repo>>['resetBookForRegeneration']>[1],
) {
  return (await repo()).resetBookForRegeneration(storyId, options)
}

export async function replaceParagraphContent(
  paragraphId: string,
  content: string,
  source?: Parameters<Awaited<ReturnType<typeof repo>>['replaceParagraphContent']>[2],
) {
  return (await repo()).replaceParagraphContent(paragraphId, content, source)
}

export async function getNextParagraphOrder(storyId: string) {
  return (await repo()).getNextParagraphOrder(storyId)
}

export async function addChapter(
  storyId: string,
  data: Parameters<Awaited<ReturnType<typeof repo>>['addChapter']>[1],
) {
  return (await repo()).addChapter(storyId, data)
}

export async function updateChapter(
  chapterId: string,
  updates: Parameters<Awaited<ReturnType<typeof repo>>['updateChapter']>[1],
) {
  return (await repo()).updateChapter(chapterId, updates)
}

export async function deleteChaptersForStory(storyId: string) {
  return (await repo()).deleteChaptersForStory(storyId)
}

export async function getNextChapterOrder(storyId: string) {
  return (await repo()).getNextChapterOrder(storyId)
}

export async function replaceChaptersForStory(
  storyId: string,
  chapters: Parameters<Awaited<ReturnType<typeof repo>>['replaceChaptersForStory']>[1],
) {
  return (await repo()).replaceChaptersForStory(storyId, chapters)
}

export async function reindexAllStories() {
  return (await repo()).reindexAllStories()
}

export async function insertStoryFromDuplicate(
  input: Parameters<Awaited<ReturnType<typeof repo>>['insertStoryFromDuplicate']>[0],
) {
  return (await repo()).insertStoryFromDuplicate(input)
}

export async function applyStoryTranslation(
  storyId: string,
  source: Parameters<Awaited<ReturnType<typeof repo>>['applyStoryTranslation']>[1],
  translated: Parameters<Awaited<ReturnType<typeof repo>>['applyStoryTranslation']>[2],
) {
  return (await repo()).applyStoryTranslation(storyId, source, translated)
}
