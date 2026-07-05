import { create } from 'zustand'
import type { InitProgressReport } from '@mlc-ai/web-llm'
import type { Character, Chapter, Folder, Paragraph, Story, StoryWithDetails } from '@/types/story'
import type { FolderFilter, LanguageFilter } from '@/types/story'
import type { ModelTier } from '@/lib/llm/engine'
import { countParagraphsWords } from '@/lib/wordCount'

interface LLMState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  modelId: string | null
  tier: ModelTier | null
  hasWebGPU: boolean
  progress: InitProgressReport | null
  error: string | null
  setLoading: (progress: InitProgressReport | null) => void
  setReady: (modelId: string, tier: ModelTier, hasWebGPU: boolean) => void
  setError: (error: string) => void
  reset: () => void
}

interface StoryState {
  stories: Story[]
  folders: Folder[]
  activeStoryId: string | null
  activeStory: StoryWithDetails | null
  searchQuery: string
  genreFilter: string
  languageFilter: LanguageFilter
  folderFilter: FolderFilter
  isGenerating: boolean
  generatingStoryId: string | null
  streamingParagraphId: string | null
  streamingContent: string
  generationError: string | null
  wordCount: number
  advancedChapterBrief: string
  setStories: (stories: Story[]) => void
  setFolders: (folders: Folder[]) => void
  setActiveStory: (story: StoryWithDetails | null) => void
  setActiveStoryId: (id: string | null) => void
  setSearchQuery: (query: string) => void
  setGenreFilter: (genre: string) => void
  setLanguageFilter: (language: LanguageFilter) => void
  setFolderFilter: (folderId: FolderFilter) => void
  isDuplicating: boolean
  duplicateProgress: string | null
  setDuplicating: (isDuplicating: boolean, progress?: string | null) => void
  updateActiveStoryMeta: (updates: Partial<Story>) => void
  updateActiveCharacters: (characters: Character[]) => void
  updateActiveChapters: (chapters: Chapter[]) => void
  updateActiveParagraphs: (paragraphs: Paragraph[]) => void
  upsertParagraph: (paragraph: Paragraph) => void
  setGenerating: (isGenerating: boolean, generatingStoryId?: string | null) => void
  setStreaming: (paragraphId: string | null, content?: string) => void
  appendStreamingToken: (token: string) => void
  setGenerationError: (error: string | null) => void
  setWordCount: (count: number) => void
  setAdvancedChapterBrief: (brief: string) => void
}

function activeStoryWordCount(state: {
  activeStory: StoryWithDetails | null
  streamingParagraphId: string | null
  streamingContent: string
}): number {
  if (!state.activeStory) return 0
  const streaming =
    state.streamingParagraphId && state.streamingContent
      ? { paragraphId: state.streamingParagraphId, content: state.streamingContent }
      : null
  return countParagraphsWords(state.activeStory.paragraphs, streaming)
}

export const useLLMStore = create<LLMState>((set) => ({
  status: 'idle',
  modelId: null,
  tier: null,
  hasWebGPU: false,
  progress: null,
  error: null,
  setLoading: (progress) => set({ status: 'loading', progress, error: null }),
  setReady: (modelId, tier, hasWebGPU) =>
    set({ status: 'ready', modelId, tier, hasWebGPU, progress: null, error: null }),
  setError: (error) => set({ status: 'error', error, progress: null }),
  reset: () =>
    set({
      status: 'idle',
      modelId: null,
      tier: null,
      hasWebGPU: false,
      progress: null,
      error: null,
    }),
}))

export const useStoryStore = create<StoryState>((set, get) => ({
  stories: [],
  folders: [],
  activeStoryId: null,
  activeStory: null,
  searchQuery: '',
  genreFilter: 'all',
  languageFilter: 'all',
  folderFilter: 'all',
  isGenerating: false,
  generatingStoryId: null,
  streamingParagraphId: null,
  streamingContent: '',
  generationError: null,
  wordCount: 0,
  advancedChapterBrief: '',
  setStories: (stories) => set({ stories }),
  setFolders: (folders) => set({ folders }),
  setActiveStory: (activeStory) =>
    set((state) => {
      const nextId = activeStory?.id ?? null
      const storyChanged = nextId !== state.activeStoryId
      const streamingParagraphId = storyChanged ? null : state.streamingParagraphId
      const streamingContent = storyChanged ? '' : state.streamingContent
      return {
        activeStory,
        activeStoryId: nextId,
        ...(storyChanged
          ? {
              streamingParagraphId,
              streamingContent,
              advancedChapterBrief: '',
            }
          : {}),
        wordCount: activeStoryWordCount({
          activeStory,
          streamingParagraphId,
          streamingContent,
        }),
      }
    }),
  setActiveStoryId: (activeStoryId) => set({ activeStoryId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setGenreFilter: (genreFilter) => set({ genreFilter }),
  setLanguageFilter: (languageFilter) => set({ languageFilter }),
  setFolderFilter: (folderFilter) => set({ folderFilter }),
  isDuplicating: false,
  duplicateProgress: null,
  setDuplicating: (isDuplicating, progress = null) =>
    set({ isDuplicating, duplicateProgress: progress }),
  updateActiveStoryMeta: (updates) => {
    const { activeStory } = get()
    if (!activeStory) return
    set({ activeStory: { ...activeStory, ...updates } })
  },
  updateActiveCharacters: (characters) => {
    const { activeStory } = get()
    if (!activeStory) return
    set({ activeStory: { ...activeStory, characters } })
  },
  updateActiveChapters: (chapters) => {
    const { activeStory } = get()
    if (!activeStory) return
    set({ activeStory: { ...activeStory, chapters } })
  },
  updateActiveParagraphs: (paragraphs) => {
    const { activeStory } = get()
    if (!activeStory) return
    set({
      activeStory: { ...activeStory, paragraphs },
      wordCount: activeStoryWordCount({ ...get(), activeStory: { ...activeStory, paragraphs } }),
    })
  },
  upsertParagraph: (paragraph) => {
    const state = get()
    const { activeStory } = state
    if (!activeStory || paragraph.storyId !== activeStory.id) return
    const exists = activeStory.paragraphs.some((p) => p.id === paragraph.id)
    const paragraphs = exists
      ? activeStory.paragraphs.map((p) => (p.id === paragraph.id ? paragraph : p))
      : [...activeStory.paragraphs, paragraph].sort((a, b) => a.order - b.order)
    const nextStory = { ...activeStory, paragraphs }
    set({
      activeStory: nextStory,
      wordCount: activeStoryWordCount({ ...state, activeStory: nextStory }),
    })
  },
  setGenerating: (isGenerating, generatingStoryId = null) =>
    set((state) => {
      const streamingParagraphId =
        isGenerating && generatingStoryId === state.activeStoryId
          ? state.streamingParagraphId
          : null
      const streamingContent =
        isGenerating && generatingStoryId === state.activeStoryId
          ? state.streamingContent
          : ''
      return {
        isGenerating,
        generatingStoryId: isGenerating ? generatingStoryId : null,
        streamingParagraphId,
        streamingContent,
        wordCount: activeStoryWordCount({
          ...state,
          streamingParagraphId,
          streamingContent,
        }),
      }
    }),
  setStreaming: (streamingParagraphId, content = '') =>
    set((state) => {
      if (
        state.generatingStoryId &&
        state.activeStoryId &&
        state.generatingStoryId !== state.activeStoryId
      ) {
        return state
      }
      return {
        streamingParagraphId,
        streamingContent: content,
        wordCount: activeStoryWordCount({
          ...state,
          streamingParagraphId,
          streamingContent: content,
        }),
      }
    }),
  appendStreamingToken: (token) =>
    set((state) => {
      if (
        state.generatingStoryId &&
        state.activeStoryId &&
        state.generatingStoryId !== state.activeStoryId
      ) {
        return state
      }
      const streamingContent = state.streamingContent + token
      return {
        streamingContent,
        wordCount: activeStoryWordCount({ ...state, streamingContent }),
      }
    }),
  setGenerationError: (generationError) => set({ generationError }),
  setWordCount: (wordCount) => set({ wordCount }),
  setAdvancedChapterBrief: (advancedChapterBrief) => set({ advancedChapterBrief }),
}))
