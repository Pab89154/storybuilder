import { useEffect, useRef, useState } from 'react'
import {
  BookMarked,
  BookOpen,
  Flag,
  Loader2,
  Plus,
  Sparkles,
  Square,
  StepForward,
  Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  AddCharacterButton,
  CharacterPanel,
  formatCharacterSummary,
} from '@/components/story/CharacterPanel'
import { useGeneration } from '@/hooks/useGeneration'
import { useUiT } from '@/i18n/context'
import { useStories } from '@/hooks/useStories'
import { useStoryStore } from '@/store/storyStore'
import { getBookProgress, getChapterStatus, getChapterWordCount } from '@/lib/chapterProgress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  clampChapterWordTarget,
  clampPlannedChapterCount,
  MAX_CHAPTER_WORDS,
  MAX_FINISH_PERCENT,
  MAX_PLANNED_CHAPTERS,
  MIN_CHAPTER_WORDS_INPUT,
  MIN_FINISH_PERCENT,
  MIN_PLANNED_CHAPTERS,
  READER_AGE_OPTIONS,
  type BookCreationMode,
  type StoryWithDetails,
} from '@/types/story'
import { cn } from '@/lib/utils'
import { updateChapter } from '@/db/database'

interface StorySetupPanelProps {
  story: StoryWithDetails
  onSaveMeta: (
    updates: Partial<StoryWithDetails>,
    options?: { persistNow?: boolean },
  ) => void
}

function ChapterStatusBadge({ status }: { status: 'pending' | 'in_progress' | 'complete' }) {
  const t = useUiT()
  const styles = {
    pending: 'bg-stone-100 text-stone-600',
    in_progress: 'bg-amber-100 text-amber-800',
    complete: 'bg-emerald-100 text-emerald-800',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', styles[status])}>
      {t(`setup.chapterStatus.${status}`)}
    </span>
  )
}

export function StorySetupPanel({ story, onSaveMeta }: StorySetupPanelProps) {
  const t = useUiT()
  const { loadStory } = useStories()
  const { isGenerating, streamingParagraphId, streamingContent, advancedChapterBrief, setAdvancedChapterBrief } =
    useStoryStore()
  const streamingWordCount =
    streamingParagraphId && streamingContent
      ? { paragraphId: streamingParagraphId, content: streamingContent }
      : null
  const [setupOpen, setSetupOpen] = useState(true)
  const [chapterTitleDrafts, setChapterTitleDrafts] = useState<Record<string, string>>({})
  const dirtyChapterTitlesRef = useRef(new Set<string>())

  const isLegacy = story.creationMode === 'legacy'
  const isAutomatic = story.creationMode === 'automatic'
  const isAdvanced = story.creationMode === 'advanced'
  const hasChapters = story.chapters.length > 0
  const bookProgress = getBookProgress(story.chapters, story.paragraphs)
  const canEditPlan = !hasChapters && !isGenerating

  const setMode = (creationMode: BookCreationMode) => {
    if (hasChapters || isGenerating) return
    void onSaveMeta({ creationMode }, { persistNow: true })
  }

  useEffect(() => {
    setChapterTitleDrafts((prev) => {
      const next = { ...prev }
      for (const chapter of story.chapters) {
        if (!dirtyChapterTitlesRef.current.has(chapter.id)) {
          next[chapter.id] = chapter.title
        }
      }
      for (const id of Object.keys(next)) {
        if (!story.chapters.some((chapter) => chapter.id === id)) {
          delete next[id]
          dirtyChapterTitlesRef.current.delete(id)
        }
      }
      return next
    })
  }, [story.chapters])

  const saveChapterTitle = (chapterId: string) => {
    const draft = chapterTitleDrafts[chapterId]
    const trimmed = (draft ?? '').trim() || t('setup.defaultChapterTitle')
    const currentTitle = story.chapters.find((chapter) => chapter.id === chapterId)?.title ?? ''
    if (trimmed === currentTitle) return
    dirtyChapterTitlesRef.current.delete(chapterId)
    void updateChapter(chapterId, { title: trimmed }).then(() =>
      loadStory(story.id, { onlyIfStillActive: true }),
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50/80"
        onClick={() => setSetupOpen((open) => !open)}
        aria-expanded={setupOpen}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Wand2 className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
          <span className="font-semibold text-stone-800">{t('setup.bookSetup')}</span>
          {!setupOpen ? (
            <span className="truncate text-xs text-stone-500">
              {t(`setup.modes.${story.creationMode}`)}
              {hasChapters
                ? ` · ${t('setup.chaptersCount', {
                    completed: bookProgress.completedCount,
                    total: bookProgress.totalChapters,
                  })}`
                : ''}
            </span>
          ) : null}
        </div>
        <span className="text-xs text-stone-400">{setupOpen ? t('setup.hide') : t('setup.show')}</span>
      </button>

      {setupOpen ? (
        <div className="space-y-4 border-t border-stone-100 px-4 pb-4 pt-3">
          {!hasChapters && !isGenerating ? (
            <div className="flex flex-wrap gap-2">
              {(['automatic', 'advanced', 'legacy'] as BookCreationMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMode(mode)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    story.creationMode === mode
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300',
                  )}
                >
                  {t(`setup.modes.${mode}`)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
            <div className="min-w-0 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-stone-600">{t('setup.readerAge')}</span>
                <Select
                  value={String(story.readerAge ?? 7)}
                  disabled={hasChapters || isGenerating}
                  onValueChange={(value) =>
                    void onSaveMeta({ readerAge: Number(value) }, { persistNow: true })
                  }
                >
                  <SelectTrigger className="h-9 border-stone-200 bg-stone-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {READER_AGE_OPTIONS.map((age) => (
                      <SelectItem key={age} value={String(age)}>
                        {t(`setup.readerAgeYears.${age}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-stone-600">{t('setup.prompt')}</span>
                <Textarea
                  value={story.prompt}
                  onChange={(event) => void onSaveMeta({ prompt: event.target.value })}
                  placeholder={t('setup.promptPlaceholder')}
                  rows={3}
                  className="w-full resize-none border-stone-200 bg-stone-50/50 text-sm focus:bg-white"
                />
              </label>
            </div>

            <div className="min-w-0 rounded-lg border border-stone-100 bg-stone-50/40 p-2 sm:p-3">
              <CollapsibleSection
                title={t('setup.characters')}
                summary={formatCharacterSummary(story.characters, t)}
                compact
                defaultOpen
                actions={<AddCharacterButton compact />}
              >
                <CharacterPanel hideHeader hideAddButton compact />
              </CollapsibleSection>
            </div>
          </div>

          {!isLegacy ? (
            <div className="space-y-3 rounded-lg border border-stone-100 bg-gradient-to-b from-stone-50/80 to-white p-3">
              {isAutomatic ? (
                <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
                  <label className="block space-y-1 text-xs">
                    <span className="font-medium text-stone-600">{t('setup.totalChapters')}</span>
                    <Input
                      type="number"
                      min={MIN_PLANNED_CHAPTERS}
                      max={MAX_PLANNED_CHAPTERS}
                      value={story.plannedChapterCount}
                      disabled={!canEditPlan}
                      onChange={(event) =>
                        void onSaveMeta(
                          {
                            plannedChapterCount: clampPlannedChapterCount(
                              Number(event.target.value) || MIN_PLANNED_CHAPTERS,
                            ),
                          },
                          { persistNow: true },
                        )
                      }
                      className="h-9 border-stone-200 bg-white"
                    />
                  </label>
                  <label className="block space-y-1 text-xs">
                    <span className="font-medium text-stone-600">
                      {t('setup.chapterWords')} ({MIN_CHAPTER_WORDS_INPUT}–{MAX_CHAPTER_WORDS})
                    </span>
                    <Input
                      type="number"
                      min={MIN_CHAPTER_WORDS_INPUT}
                      max={MAX_CHAPTER_WORDS}
                      step={100}
                      value={story.chapterWordTarget}
                      disabled={!canEditPlan}
                      onChange={(event) =>
                        void onSaveMeta(
                          {
                            chapterWordTarget: clampChapterWordTarget(
                              Number(event.target.value) || story.chapterWordTarget,
                            ),
                          },
                          { persistNow: true },
                        )
                      }
                      className="h-9 border-stone-200 bg-white"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
                  <label className="block space-y-1 text-xs">
                    <span className="font-medium text-stone-600">{t('setup.chapterWords')}</span>
                    <Input
                      type="number"
                      min={MIN_CHAPTER_WORDS_INPUT}
                      max={MAX_CHAPTER_WORDS}
                      step={100}
                      value={story.chapterWordTarget}
                      disabled={isGenerating || story.isBookFinished}
                      onChange={(event) =>
                        void onSaveMeta(
                          {
                            chapterWordTarget: clampChapterWordTarget(
                              Number(event.target.value) || story.chapterWordTarget,
                            ),
                          },
                          { persistNow: true },
                        )
                      }
                      className="h-9 border-stone-200 bg-white"
                    />
                  </label>
                  <label className="block space-y-1 text-xs">
                    <span className="font-medium text-stone-600">
                      {t('setup.finalePercent', {
                        min: MIN_FINISH_PERCENT,
                        max: MAX_FINISH_PERCENT,
                      })}
                    </span>
                    <Input
                      type="number"
                      min={MIN_FINISH_PERCENT}
                      max={MAX_FINISH_PERCENT}
                      value={story.finishPercent}
                      disabled={isGenerating || story.isBookFinished}
                      onChange={(event) =>
                        void onSaveMeta(
                          {
                            finishPercent: Math.max(
                              MIN_FINISH_PERCENT,
                              Math.min(MAX_FINISH_PERCENT, Number(event.target.value) || 25),
                            ),
                          },
                          { persistNow: true },
                        )
                      }
                      className="h-9 border-stone-200 bg-white"
                    />
                  </label>
                </div>
              )}

              {hasChapters ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    {t('setup.chaptersProgress', {
                      completed: bookProgress.completedCount,
                      total: bookProgress.totalChapters,
                    })}
                  </p>
                  <ul className="space-y-1.5">
                    {story.chapters.map((chapter, index) => {
                      const status = getChapterStatus(chapter, story.paragraphs)
                      const words = getChapterWordCount(
                        chapter.id,
                        story.paragraphs,
                        streamingWordCount,
                        story.chapters,
                      )
                      return (
                        <li
                          key={chapter.id}
                          className="flex flex-col gap-2 rounded-md border border-stone-200/80 bg-white p-2.5 sm:flex-row sm:items-center sm:gap-3"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <BookOpen className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                            <span className="w-5 shrink-0 text-xs tabular-nums text-stone-400">
                              {index + 1}
                            </span>
                            <Input
                              value={chapterTitleDrafts[chapter.id] ?? chapter.title}
                              disabled={isGenerating}
                              onChange={(event) => {
                                dirtyChapterTitlesRef.current.add(chapter.id)
                                setChapterTitleDrafts((prev) => ({
                                  ...prev,
                                  [chapter.id]: event.target.value,
                                }))
                              }}
                              onBlur={() => saveChapterTitle(chapter.id)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.currentTarget.blur()
                                }
                              }}
                              className="h-8 min-w-0 w-full flex-1 border-none bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-1"
                              aria-label={t('setup.chapterTitleAria', { number: index + 1 })}
                            />
                          </div>
                          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                            <ChapterStatusBadge status={status} />
                            <span className="text-[10px] tabular-nums text-stone-500">
                              {words}/{chapter.targetWordCount}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              {isAdvanced && !story.isBookFinished ? (
                <label className="block space-y-1 text-xs">
                  <span className="font-medium text-stone-600">{t('setup.nextChapterNotes')}</span>
                  <Textarea
                    value={advancedChapterBrief}
                    disabled={isGenerating}
                    onChange={(event) => setAdvancedChapterBrief(event.target.value)}
                    placeholder={t('setup.nextChapterNotesPlaceholder')}
                    rows={2}
                    className="resize-none border-stone-200 bg-white text-sm"
                  />
                </label>
              ) : null}

              {story.isBookFinished ? (
                <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                  <BookMarked className="h-4 w-4" />
                  {t('setup.bookFinished')}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-muted-foreground)]">{t('setup.legacyModeHint')}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function StorySetupActions({
  story,
  advancedBrief = '',
  className,
  buttonClassName,
}: {
  story: StoryWithDetails
  advancedBrief?: string
  className?: string
  buttonClassName?: string
}) {
  const t = useUiT()
  const {
    generateAutomatic,
    addAdvancedChapter,
    finishBook,
    requestFinishBook,
    continueAdvanced,
    cancel,
    isGenerating,
    isLoading,
  } = useGeneration()

  const isLegacy = story.creationMode === 'legacy'
  const isAutomatic = story.creationMode === 'automatic'
  const isAdvanced = story.creationMode === 'advanced'
  const hasChapters = story.chapters.length > 0
  const bookProgress = getBookProgress(story.chapters, story.paragraphs)

  if (isLegacy) return null

  const startLabel = hasChapters ? t('setup.continueBook') : t('setup.startBook')
  const inProgressHint =
    bookProgress.inProgressChapter
      ? t('setup.chapterInProgressHint', { title: bookProgress.inProgressChapter.title })
      : undefined

  return (
    <div className={cn(className ?? 'flex flex-wrap items-center gap-1')}>
      {isAutomatic ? (
        <Button
          className={buttonClassName}
          size={buttonClassName ? undefined : 'sm'}
          onClick={() => void generateAutomatic()}
          disabled={isGenerating || isLoading || story.isBookFinished}
          title={inProgressHint ?? undefined}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasChapters ? (
            <StepForward className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {startLabel}
        </Button>
      ) : null}

      {isAdvanced && !story.isBookFinished ? (
        <>
          {bookProgress.canContinue ? (
            <Button
              className={buttonClassName}
              size={buttonClassName ? undefined : 'sm'}
              variant="secondary"
              onClick={() => void continueAdvanced()}
              disabled={isGenerating || isLoading}
              title={inProgressHint ?? undefined}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <StepForward className="h-4 w-4" />
              )}
              {t('setup.continueBook')}
            </Button>
          ) : null}
          <Button
            className={buttonClassName}
            size={buttonClassName ? undefined : 'sm'}
            onClick={() => void addAdvancedChapter(advancedBrief)}
            disabled={isGenerating || isLoading}
          >
            <Plus className="h-4 w-4" />
            {t('setup.newChapter')}
          </Button>
          {hasChapters ? (
            <Button
              className={buttonClassName}
              size={buttonClassName ? undefined : 'sm'}
              variant="outline"
              onClick={() => void finishBook()}
              disabled={isGenerating || isLoading}
            >
              <Flag className="h-4 w-4" />
              {t('setup.finish')}
            </Button>
          ) : null}
        </>
      ) : null}

      {isGenerating ? (
        <>
          {!story.isBookFinished ? (
            <Button
              className={buttonClassName}
              size={buttonClassName ? undefined : 'sm'}
              variant="secondary"
              onClick={() => void requestFinishBook()}
              title={t('setup.finishBookHint')}
            >
              <Flag className="h-4 w-4" />
              {t('setup.finishBook')}
            </Button>
          ) : null}
          <Button
            className={buttonClassName}
            size={buttonClassName ? undefined : 'sm'}
            variant="outline"
            onClick={cancel}
            aria-label={t('workspace.stop')}
          >
            <Square className="h-4 w-4" />
            {t('workspace.stop')}
          </Button>
        </>
      ) : null}
    </div>
  )
}
