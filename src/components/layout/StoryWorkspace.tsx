import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Download,
  Loader2,
  PanelLeft,
  Pencil,
  Sparkles,
  Square,
  StepForward,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StorySetupPanel, StorySetupActions } from '@/components/story/StorySetupPanel'
import { StoryEditBody } from '@/components/story/StoryEditBody'
import { StoryBookReader } from '@/components/story/StoryBookReader'
import { getBookProgress, getChapterWordCount } from '@/lib/chapterProgress'
import { WebGPUWarning } from '@/components/model/WebGPUWarning'
import { downloadStoryTxt } from '@/lib/export/txt'
import { LanguageSelect } from '@/components/story/LanguageSelect'
import { DuplicateStoryDialog } from '@/components/story/DuplicateStoryDialog'
import { useUiT } from '@/i18n/context'
import { useStories } from '@/hooks/useStories'
import { useGeneration } from '@/hooks/useGeneration'
import { useStoryStore } from '@/store/storyStore'
import { cn } from '@/lib/utils'

type StoryViewMode = 'read' | 'edit'

const GENRE_I18N_KEYS = [
  'adventure',
  'fantasy',
  'mystery',
  'scifi',
  'fairytale',
  'friendship',
  'animals',
  'superhero',
  'historical',
] as const

interface StoryWorkspaceProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

function ViewModeToggle({
  viewMode,
  onChange,
  t,
}: {
  viewMode: StoryViewMode
  onChange: (mode: StoryViewMode) => void
  t: (key: string) => string
}) {
  return (
    <div className="flex rounded-lg border p-0.5">
      <button
        type="button"
        className={cn(
          'rounded-md px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 sm:py-1.5',
          viewMode === 'read'
            ? 'bg-[var(--color-primary)] text-white'
            : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
        )}
        onClick={() => onChange('read')}
      >
        <BookOpen className="mr-1.5 inline h-4 w-4" />
        {t('workspace.read')}
      </button>
      <button
        type="button"
        className={cn(
          'rounded-md px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 sm:py-1.5',
          viewMode === 'edit'
            ? 'bg-[var(--color-primary)] text-white'
            : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
        )}
        onClick={() => onChange('edit')}
      >
        <Pencil className="mr-1.5 inline h-4 w-4" />
        {t('workspace.edit')}
      </button>
    </div>
  )
}

export function StoryWorkspace({ sidebarCollapsed, onToggleSidebar }: StoryWorkspaceProps) {
  const t = useUiT()
  const { activeStory, saveStoryMeta, folders, moveStory, setBookmark } = useStories()
  const { generate, continueStory, cancel, isGenerating, isReady } = useGeneration()
  const { wordCount, generationError, isDuplicating, streamingParagraphId, streamingContent } =
    useStoryStore()
  const streamingWordCount =
    streamingParagraphId && streamingContent
      ? { paragraphId: streamingParagraphId, content: streamingContent }
      : null
  const [viewMode, setViewMode] = useState<StoryViewMode>('read')
  const openedStoryIdRef = useRef<string | null>(null)

  // Only pick a default mode when the user opens a different story — never while generating.
  useEffect(() => {
    if (!activeStory) {
      openedStoryIdRef.current = null
      return
    }
    if (openedStoryIdRef.current === activeStory.id) return
    openedStoryIdRef.current = activeStory.id
    const isNewStory =
      activeStory.paragraphs.length === 0 && activeStory.chapters.length === 0
    setViewMode(isNewStory ? 'edit' : 'read')
  }, [activeStory?.id, activeStory?.paragraphs.length, activeStory?.chapters.length])

  if (!activeStory) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <Sparkles className="h-12 w-12 text-[var(--color-primary)] opacity-60" />
        <div>
          <h2 className="text-xl font-semibold">{t('workspace.welcomeTitle')}</h2>
          <p className="mt-1 max-w-md text-[var(--color-muted-foreground)]">
            {t('workspace.welcomeHint')}
          </p>
        </div>
      </div>
    )
  }

  const isChapterBook = activeStory.creationMode !== 'legacy'
  const bookProgress = isChapterBook
    ? getBookProgress(activeStory.chapters, activeStory.paragraphs)
    : null
  const activeChapter = bookProgress?.inProgressChapter ?? null
  const chapterWords = activeChapter
    ? getChapterWordCount(
        activeChapter.id,
        activeStory.paragraphs,
        streamingWordCount,
        activeStory.chapters,
      )
    : wordCount
  const target =
    activeStory.creationMode === 'legacy'
      ? activeStory.targetWordCount
      : activeChapter
        ? activeChapter.targetWordCount
        : activeStory.chapters.length > 0
          ? activeStory.chapters.reduce((sum, chapter) => sum + chapter.targetWordCount, 0)
          : activeStory.plannedChapterCount * activeStory.chapterWordTarget
  const displayWords = isChapterBook && activeChapter ? chapterWords : wordCount
  const cappedProgress = Math.min(
    Math.round((displayWords / Math.max(target, 1)) * 100),
    100,
  )
  const isFinishingChapter =
    isGenerating &&
    isChapterBook &&
    activeChapter !== null &&
    displayWords >= target

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b bg-white px-3 py-2 sm:px-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {sidebarCollapsed ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={onToggleSidebar}
                title={t('workspace.expandSidebar')}
                aria-label={t('workspace.expandSidebar')}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <BookOpen
              className="hidden h-4 w-4 shrink-0 text-[var(--color-primary)] sm:block"
              aria-hidden
            />
            <Input
              value={activeStory.title}
              onChange={(e) => void saveStoryMeta({ title: e.target.value })}
              placeholder={t('workspace.storyTitle')}
              aria-label={t('workspace.storyTitle')}
              className="h-9 min-w-0 flex-1 border-none px-0 text-base font-semibold shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end">
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} t={t} />
            {activeStory.creationMode === 'legacy' ? (
              <>
                <Button
                  size="sm"
                  onClick={() => void generate()}
                  disabled={!isReady || isGenerating || isDuplicating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {t('workspace.generate')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void continueStory()}
                  disabled={
                    !isReady || isGenerating || isDuplicating || activeStory.paragraphs.length === 0
                  }
                >
                  <StepForward className="h-3.5 w-3.5" />
                  {t('workspace.continue')}
                </Button>
              </>
            ) : null}
            {isChapterBook ? <StorySetupActions story={activeStory} /> : null}
            {isGenerating && !isChapterBook ? (
              <Button size="sm" variant="outline" onClick={cancel}>
                <Square className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <DuplicateStoryDialog
              story={activeStory}
              disabled={isGenerating || isDuplicating}
              buttonSize="sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadStoryTxt(
                  activeStory,
                  activeStory.characters,
                  activeStory.paragraphs,
                  activeStory.chapters,
                )
              }
              disabled={activeStory.paragraphs.length === 0 || isDuplicating}
              title={t('workspace.exportTxt')}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('workspace.export')}</span>
            </Button>
          </div>
        </div>

        {viewMode === 'edit' ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <LanguageSelect
            value={activeStory.language}
            onValueChange={(language) => void saveStoryMeta({ language }, { persistNow: true })}
            triggerClassName="h-9 min-w-[6.5rem] flex-1 text-xs sm:h-8 sm:w-[7.5rem] sm:flex-none"
          />
          <Input
            list="genre-suggestions"
            value={activeStory.genre ?? ''}
            onChange={(e) => void saveStoryMeta({ genre: e.target.value })}
            placeholder={t('workspace.genre')}
            aria-label={t('workspace.genre')}
            className="h-9 min-w-[5rem] flex-1 text-xs sm:h-8 sm:w-28 sm:flex-none"
          />
          <datalist id="genre-suggestions">
            {GENRE_I18N_KEYS.map((key) => (
              <option key={key} value={t(`genres.${key}`)} />
            ))}
          </datalist>
          <Select
            value={activeStory.folderId ?? 'none'}
            onValueChange={(value) =>
              void moveStory(activeStory.id, value === 'none' ? null : value)
            }
          >
            <SelectTrigger className="h-9 min-w-[8rem] flex-1 text-xs sm:h-8 sm:w-44 sm:flex-none" aria-label={t('workspace.collection')}>
              <SelectValue placeholder={t('workspace.collection')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('sidebar.uncategorized')}</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Progress
              value={cappedProgress}
              className={cn('h-1 min-w-[4rem] flex-1', isFinishingChapter && '[&>div]:bg-amber-500')}
            />
            <span
              className={cn(
                'shrink-0 text-[10px] tabular-nums',
                isFinishingChapter
                  ? 'font-medium text-amber-800'
                  : 'text-[var(--color-muted-foreground)]',
              )}
            >
              {displayWords}/{target}
              {isFinishingChapter ? ` · ${t('workspace.finishingChapter')}` : ` (${cappedProgress}%)`}
            </span>
          </div>
        </div>
        ) : null}
      </header>

      {viewMode === 'read' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-stone-50/40">
          {generationError ? (
            <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
              {generationError}
            </div>
          ) : null}
          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 sm:px-4 md:px-5',
            )}
          >
            <StoryBookReader
              storyId={activeStory.id}
              storyTitle={activeStory.title}
              language={activeStory.language}
              genre={activeStory.genre}
              storyPrompt={activeStory.prompt}
              readerAge={activeStory.readerAge}
              paragraphs={activeStory.paragraphs}
              chapters={activeStory.chapters}
              bookmarkPageIndex={activeStory.bookmarkPageIndex}
              onSetBookmark={(pageIndex) => void setBookmark(pageIndex)}
              streamingParagraphId={streamingParagraphId}
              streamingContent={streamingContent}
              fillHeight
            />
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'flex-1 overflow-y-auto overscroll-y-contain',
          )}
        >
          <div className="mx-auto max-w-3xl space-y-3 p-4">
            <WebGPUWarning />

            {generationError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {generationError}
              </div>
            ) : null}

            <StorySetupPanel
              story={activeStory}
              onSaveMeta={(updates, options) => void saveStoryMeta(updates, options)}
            />

            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {t('workspace.storySection')}
              </h3>

              {activeStory.paragraphs.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center text-[var(--color-muted-foreground)]">
                  {t('workspace.noParagraphsYet')}
                </div>
              ) : (
                <StoryEditBody
                  chapters={activeStory.chapters}
                  paragraphs={activeStory.paragraphs}
                />
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
