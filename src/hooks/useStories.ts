import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  createFolder,
  createStory,
  deleteFolder,
  deleteStory,
  getStoryWithDetails,
  listFolders,
  listStories,
  moveStoryToFolder,
  moveStoryToPosition as moveStoryToPositionDb,
  setStoryBookmarkPage,
  updateFolder,
  updateStory,
} from '@/db/database'
import { ensureDbStartupInit } from '@/lib/dbStartup'
import { collectGenres, storyMatchesQuery } from '@/lib/search'
import { untitledStoryTitle } from '@/lib/storyLanguageMeta'
import { useStoryStore } from '@/store/storyStore'
import type { FolderFilter, Language, Story } from '@/types/story'

function filterByFolder<T extends { folderId: string | null }>(
  items: T[],
  folderFilter: FolderFilter,
): T[] {
  if (folderFilter === 'all') return items
  if (folderFilter === 'uncategorized') return items.filter((s) => s.folderId === null)
  return items.filter((s) => s.folderId === folderFilter)
}

export function useStories() {
  const {
    stories,
    folders,
    activeStory,
    activeStoryId,
    searchQuery,
    genreFilter,
    languageFilter,
    folderFilter,
    setStories,
    setFolders,
    setActiveStory,
    setSearchQuery,
    setGenreFilter,
    setLanguageFilter,
    setFolderFilter,
    updateActiveStoryMeta,
  } = useStoryStore()

  const pendingMetaRef = useRef<Partial<Story>>({})
  const persistMetaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshStories = useCallback(async () => {
    const [allStories, allFolders] = await Promise.all([listStories(), listFolders()])
    setStories(allStories)
    setFolders(allFolders)
  }, [setStories, setFolders])

  const flushStoryMetaForStory = useCallback(
    async (storyId: string, pending: Partial<Story>) => {
      if (Object.keys(pending).length === 0) return
      await updateStory(storyId, pending)
      await refreshStories()
    },
    [refreshStories],
  )

  const flushStoryMeta = useCallback(async () => {
    if (!activeStory) return
    const pending = pendingMetaRef.current
    pendingMetaRef.current = {}
    await flushStoryMetaForStory(activeStory.id, pending)
  }, [activeStory, flushStoryMetaForStory])

  useEffect(() => {
    const storyIdAtMount = activeStoryId
    return () => {
      if (persistMetaTimerRef.current) {
        clearTimeout(persistMetaTimerRef.current)
        persistMetaTimerRef.current = null
      }
      const pending = pendingMetaRef.current
      pendingMetaRef.current = {}
      if (storyIdAtMount && Object.keys(pending).length > 0) {
        void flushStoryMetaForStory(storyIdAtMount, pending)
      }
    }
  }, [activeStoryId, flushStoryMetaForStory])

  const loadStory = useCallback(
    async (storyId: string) => {
      const details = await getStoryWithDetails(storyId)
      setActiveStory(details)
      return details
    },
    [setActiveStory],
  )

  const createNewStory = useCallback(
    async (language: Language = 'en', readerAge?: number) => {
      const folderId =
        folderFilter !== 'all' && folderFilter !== 'uncategorized' ? folderFilter : null
      const story = await createStory({
        language,
        title: untitledStoryTitle(language),
        folderId,
        readerAge,
      })
      await refreshStories()
      const details = await getStoryWithDetails(story.id)
      setActiveStory(details)
      return details
    },
    [folderFilter, refreshStories, setActiveStory],
  )

  const removeStory = useCallback(
    async (storyId: string) => {
      await deleteStory(storyId)
      await refreshStories()
      if (activeStoryId === storyId) {
        setActiveStory(null)
      }
    },
    [activeStoryId, refreshStories, setActiveStory],
  )

  const renameStory = useCallback(
    async (storyId: string, title: string) => {
      const trimmed = title.trim() || untitledStoryTitle(
        activeStoryId === storyId && activeStory ? activeStory.language : 'en',
      )
      if (activeStoryId === storyId) {
        updateActiveStoryMeta({ title: trimmed })
      }
      await updateStory(storyId, { title: trimmed })
      await refreshStories()
    },
    [activeStory, activeStoryId, refreshStories, updateActiveStoryMeta],
  )

  type StoryMetaUpdates = {
    title?: string
    language?: Language
    prompt?: string
    genre?: string
    folderId?: string | null
    bookmarkPageIndex?: number | null
    creationMode?: Story['creationMode']
    plannedChapterCount?: number
    storyBeginning?: string
    storyEnding?: string
    chapterWordTarget?: number
    readerAge?: number
    finishPercent?: number
    isBookFinished?: boolean
  }

  const saveStoryMeta = useCallback(
    (updates: StoryMetaUpdates, options?: { persistNow?: boolean }) => {
      if (!activeStory) return

      updateActiveStoryMeta(updates)
      pendingMetaRef.current = { ...pendingMetaRef.current, ...updates }

      if (options?.persistNow) {
        if (persistMetaTimerRef.current) {
          clearTimeout(persistMetaTimerRef.current)
          persistMetaTimerRef.current = null
        }
        void flushStoryMeta()
        return
      }

      if (persistMetaTimerRef.current) clearTimeout(persistMetaTimerRef.current)
      persistMetaTimerRef.current = setTimeout(() => {
        persistMetaTimerRef.current = null
        void flushStoryMeta()
      }, 450)
    },
    [activeStory, updateActiveStoryMeta, flushStoryMeta],
  )

  const setBookmark = useCallback(
    async (pageIndex: number | null) => {
      if (!activeStory) return
      await setStoryBookmarkPage(activeStory.id, pageIndex)
      updateActiveStoryMeta({ bookmarkPageIndex: pageIndex })
      setStories(
        stories.map((story) =>
          story.id === activeStory.id ? { ...story, bookmarkPageIndex: pageIndex } : story,
        ),
      )
    },
    [activeStory, stories, setStories, updateActiveStoryMeta],
  )

  const addFolder = useCallback(
    async (name: string) => {
      const folder = await createFolder(name)
      await refreshStories()
      return folder
    },
    [refreshStories],
  )

  const renameFolder = useCallback(
    async (folderId: string, name: string) => {
      await updateFolder(folderId, { name: name.trim() || 'Collection' })
      await refreshStories()
    },
    [refreshStories],
  )

  const removeFolder = useCallback(
    async (folderId: string) => {
      await deleteFolder(folderId)
      if (folderFilter === folderId) {
        setFolderFilter('all')
      }
      await refreshStories()
    },
    [folderFilter, refreshStories, setFolderFilter],
  )

  const moveStory = useCallback(
    async (storyId: string, folderId: string | null) => {
      await moveStoryToFolder(storyId, folderId)
      await refreshStories()
      if (activeStoryId === storyId) {
        updateActiveStoryMeta({ folderId })
      }
    },
    [activeStoryId, refreshStories, updateActiveStoryMeta],
  )

  const moveStoryToPosition = useCallback(
    async (storyId: string, targetFolderId: string | null, targetIndex: number) => {
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

      const updates = new Map<string, { folderId?: string | null; sortOrder: number }>()

      if (sourceFolderId !== targetFolderId) {
        sourceStories.forEach((item, index) => {
          updates.set(item.id, { sortOrder: index })
        })
      }

      targetStories.forEach((item, index) => {
        if (item.id === storyId) {
          updates.set(item.id, { folderId: targetFolderId, sortOrder: index })
        } else {
          updates.set(item.id, { sortOrder: index })
        }
      })

      setStories(
        stories.map((item) => {
          const update = updates.get(item.id)
          return update ? { ...item, ...update } : item
        }),
      )

      if (activeStoryId === storyId && sourceFolderId !== targetFolderId) {
        updateActiveStoryMeta({ folderId: targetFolderId })
      }

      try {
        await moveStoryToPositionDb(storyId, targetFolderId, clampedIndex)
      } catch {
        await refreshStories()
      }
    },
    [activeStoryId, stories, setStories, updateActiveStoryMeta],
  )

  useEffect(() => {
    void refreshStories()
    void ensureDbStartupInit().then(() => refreshStories())
  }, [refreshStories])

  const availableGenres = useMemo(() => collectGenres(stories), [stories])

  const filteredStories = useMemo(() => {
    let result = filterByFolder(stories, folderFilter)

    if (genreFilter !== 'all') {
      result = result.filter(
        (story) => story.genre.trim().toLowerCase() === genreFilter.toLowerCase(),
      )
    }

    if (languageFilter !== 'all') {
      result = result.filter((story) => story.language === languageFilter)
    }

    if (searchQuery.trim()) {
      result = result.filter((story) => storyMatchesQuery(story, searchQuery))
    }

    return result
  }, [stories, folderFilter, genreFilter, languageFilter, searchQuery])

  const storiesByFolder = useMemo(() => {
    const grouped = new Map<string | null, typeof filteredStories>()
    grouped.set(null, [])
    for (const folder of folders) {
      grouped.set(folder.id, [])
    }
    for (const story of filteredStories) {
      const list = grouped.get(story.folderId) ?? grouped.get(null)!
      list.push(story)
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return grouped
  }, [filteredStories, folders])

  return {
    stories: filteredStories,
    allStories: stories,
    storiesByFolder,
    folders,
    availableGenres,
    activeStory,
    activeStoryId,
    searchQuery,
    genreFilter,
    languageFilter,
    folderFilter,
    setSearchQuery,
    setGenreFilter,
    setLanguageFilter,
    setFolderFilter,
    refreshStories,
    loadStory,
    createNewStory,
    removeStory,
    renameStory,
    saveStoryMeta,
    setBookmark,
    addFolder,
    renameFolder,
    removeFolder,
    moveStory,
    moveStoryToPosition,
  }
}
