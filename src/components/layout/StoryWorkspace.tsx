import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Download,
  Loader2,
  Pencil,
  Sparkles,
  Square,
  StepForward,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputWithMic } from '@/components/ui/input-with-mic'
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
import { WelcomeScreen } from '@/components/layout/WelcomeScreen'
import { useUiT } from '@/i18n/context'
import { useStories } from '@/hooks/useStories'
import { useStoryLanguage } from '@/hooks/useStoryLanguage'
import { cancelActiveGeneration, useGeneration } from '@/hooks/useGeneration'
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

const toolbarItemClass =
  'h-10 min-w-0 flex-1 basis-[calc(50%-0.25rem)] px-3 text-sm whitespace-nowrap sm:basis-0'

const viewModeToggleClass =
  'h-10 min-w-max flex-1 basis-[calc(50%-0.25rem)] sm:basis-0'

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
    <div className={cn('flex rounded-lg border', viewModeToggleClass, 'px-0')}>
      <button
        type="button"
        aria-pressed={viewMode === 'read'}
        className={cn(
          'flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-2.5 text-sm font-medium transition-colors',
          viewMode === 'read'
            ? 'rounded-l-[calc(0.5rem-1px)] bg-[var(--color-primary)] text-white'
            : 'rounded-l-[calc(0.5rem-1px)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
        )}
        onClick={() => onChange('read')}
      >
        <BookOpen className="h-4 w-4 shrink-0" />
        {t('workspace.read')}
      </button>
      <button
        type="button"
        aria-pressed={viewMode === 'edit'}
        className={cn(
          'flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-l px-2.5 text-sm font-medium transition-colors',
          viewMode === 'edit'
            ? 'rounded-r-[calc(0.5rem-1px)] border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
            : 'rounded-r-[calc(0.5rem-1px)] border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
        )}
        onClick={() => onChange('edit')}
      >
        <Pencil className="h-4 w-4 shrink-0" />
        {t('workspace.edit')}
      </button>
    </div>
  )
}

export function StoryWorkspace() {
  const t = useUiT()
  const { activeStory, saveStoryMeta, folders, moveStory, setBookmark } = useStories()
  const { changeStoryLanguage } = useStoryLanguage()
  const { generate, continueStory, isGenerating, isLoading } = useGeneration()
  const {
    wordCount,
    generationError,
    isDuplicating,
    duplicateProgress,
    streamingParagraphId,
    streamingContent,
    advancedChapterBrief,
  } = useStoryStore()
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
  }, [activeStory])

  if (!activeStory) {
    return (
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <WelcomeScreen />
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
      <header className="shrink-0 border-b bg-[var(--color-card)] px-3 py-2 sm:px-4">
        <div className="flex flex-col gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <BookOpen
              className="h-4 w-4 shrink-0 text-[var(--color-primary)]"
              aria-hidden
            />
            <InputWithMic
              language={activeStory.language}
              value={activeStory.title}
              onChange={(e) => void saveStoryMeta({ title: e.target.value })}
              placeholder={t('workspace.storyTitle')}
              aria-label={t('workspace.storyTitle')}
              className="h-9 min-w-0 flex-1 border-none px-0 text-base font-semibold shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="flex w-full flex-wrap items-stretch gap-2">
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} t={t} />
            {activeStory.creationMode === 'legacy' ? (
              <>
                <Button
                  className={toolbarItemClass}
                  onClick={() => void generate()}
                  disabled={isGenerating || isDuplicating || isLoading}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {t('workspace.generate')}
                </Button>
                <Button
                  className={toolbarItemClass}
                  variant="secondary"
                  onClick={() => void continueStory()}
                  disabled={
                    isGenerating || isDuplicating || isLoading || activeStory.paragraphs.length === 0
                  }
                >
                  <StepForward className="h-4 w-4" />
                  {t('workspace.continue')}
                </Button>
              </>
            ) : null}
            {isChapterBook ? (
              <StorySetupActions
                story={activeStory}
                className="contents"
                buttonClassName={toolbarItemClass}
                advancedBrief={advancedChapterBrief}
              />
            ) : null}
            {isGenerating && !isChapterBook ? (
              <Button className={toolbarItemClass} variant="outline" onClick={cancelActiveGeneration}>
                <Square className="h-4 w-4" />
                {t('workspace.stop')}
              </Button>
            ) : null}
            <DuplicateStoryDialog
              story={activeStory}
              disabled={isGenerating || isDuplicating}
              buttonClassName={toolbarItemClass}
            />
            <Button
              className={toolbarItemClass}
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
              <Download className="h-4 w-4" />
              {t('workspace.export')}
            </Button>
          </div>
        </div>

        {viewMode === 'edit' ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[6.5rem] flex-1 flex-col gap-1 sm:w-[7.5rem] sm:flex-none">
            <LanguageSelect
              value={activeStory.language}
              disabled={isGenerating || isDuplicating}
              onValueChange={(language) => void changeStoryLanguage(activeStory, language)}
              triggerClassName="h-9 w-full text-xs sm:h-8"
            />
            {isDuplicating && duplicateProgress ? (
              <span className="text-[10px] text-[var(--color-muted-foreground)]">{duplicateProgress}</span>
            ) : null}
          </div>
          <InputWithMic
            language={activeStory.language}
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
          <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4 md:px-5">
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
