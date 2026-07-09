import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUiT } from '@/i18n/context'
import {
  spreadCount,
  spreadIndexFromPage,
  SPREAD_GAP_PX,
  useViewportBookLayout,
  useInlineBookLayout,
  buildFullPageFont,
  DEFAULT_FONT_SIZE_PX,
  MIN_FONT_SIZE_PX,
  MAX_FONT_SIZE_PX,
  layoutsEqual,
} from '@/hooks/useViewportBookLayout'
import {
  LINES_PER_PAGE,
  paginateStory,
  type PaginateOptions,
  type StoryPage,
} from '@/lib/storyPagination'
import { useBlindKidMode } from '@/context/blindKidMode'
import { useSpeechSynthesis, type SpeechPlaybackStatus } from '@/hooks/useSpeechSynthesis'
import { getPageSpeechText, getSpreadSpeechText } from '@/lib/speechPageText'
import { ReaderSpeechControls } from '@/components/ui/field-with-mic'
import { cn } from '@/lib/utils'
import type { Language } from '@/types/story'
import type { Chapter, Paragraph } from '@/types/story'

const FONT_SIZE_STORAGE_KEY = 'storybuilder-read-font-size'

function readStoredFontSize(): number {
  try {
    const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY)
    if (!stored) return DEFAULT_FONT_SIZE_PX
    const parsed = Number(stored)
    if (Number.isNaN(parsed)) return DEFAULT_FONT_SIZE_PX
    return Math.min(MAX_FONT_SIZE_PX, Math.max(MIN_FONT_SIZE_PX, parsed))
  } catch {
    return DEFAULT_FONT_SIZE_PX
  }
}

function FontSizeControl({
  fontSizePx,
  onChange,
  dark = false,
}: {
  fontSizePx: number
  onChange: (size: number) => void
  dark?: boolean
}) {
  const t = useUiT()
  const step = (delta: number) => {
    const next = Math.min(MAX_FONT_SIZE_PX, Math.max(MIN_FONT_SIZE_PX, fontSizePx + delta))
    onChange(next)
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(next))
    } catch {
      // ignore storage errors
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-md border px-1',
        dark ? 'border-stone-600 bg-stone-800' : 'border-[var(--color-border)] bg-white',
      )}
      title={t('reader.textSizeHint')}
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-7 w-7', dark && 'text-stone-300 hover:bg-stone-700 hover:text-white')}
        onClick={() => step(-1)}
        disabled={fontSizePx <= MIN_FONT_SIZE_PX}
        aria-label={t('reader.decreaseTextSize')}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span
        className={cn(
          'min-w-[2.5rem] text-center text-xs tabular-nums',
          dark ? 'text-stone-300' : 'text-[var(--color-muted-foreground)]',
        )}
      >
        {fontSizePx}px
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-7 w-7', dark && 'text-stone-300 hover:bg-stone-700 hover:text-white')}
        onClick={() => step(1)}
        disabled={fontSizePx >= MAX_FONT_SIZE_PX}
        aria-label={t('reader.increaseTextSize')}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

interface StoryBookReaderProps {
  storyId: string
  storyTitle: string
  language: Language
  genre: string
  storyPrompt: string
  readerAge: number
  paragraphs: Paragraph[]
  chapters?: Chapter[]
  bookmarkPageIndex: number | null
  onSetBookmark: (pageIndex: number | null) => void
  streamingParagraphId?: string | null
  streamingContent?: string
  fillHeight?: boolean
}

function InlineBookPage({
  page,
  pageNumber,
  isBookmarked,
  lineHeightPx,
  fontSizePx = DEFAULT_FONT_SIZE_PX,
}: {
  page: StoryPage
  pageNumber: number
  isBookmarked: boolean
  lineHeightPx: number
  fontSizePx?: number
}) {
  return (
    <div
      className={cn(
        'book-paper flex h-full min-h-0 w-full flex-col rounded-2xl border border-stone-200/80 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8',
        isBookmarked && 'ring-2 ring-[var(--color-primary)]/30',
      )}
    >
      <div
        className={cn(
          'shrink-0 text-center',
          page.isChapterTitlePage
            ? 'flex min-h-0 flex-1 flex-col items-center justify-center px-2'
            : 'mb-3 border-b border-stone-200/80 pb-3',
        )}
      >
        {page.chapterTitle ? (
          <h2
            className={cn(
              'font-serif font-bold leading-tight text-stone-900',
              page.isChapterTitlePage ? 'text-3xl md:text-4xl' : 'mb-2 text-xl',
            )}
          >
            {page.chapterTitle}
          </h2>
        ) : null}
        {!page.isChapterTitlePage ? (
          <div className="text-xs uppercase tracking-widest text-stone-400">{pageNumber}</div>
        ) : null}
      </div>
      {!page.isChapterTitlePage ? (
        <div
          className="min-h-0 flex-1 overflow-hidden text-stone-800"
          style={{ font: buildFullPageFont(fontSizePx) }}
        >
          {page.lines.map((line, lineIndex) => (
            <div
              key={`${pageNumber}-${lineIndex}`}
              className="overflow-hidden whitespace-nowrap"
              style={{ height: lineHeightPx, lineHeight: `${lineHeightPx}px` }}
              aria-hidden={!line}
            >
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SpreadPagePanel({
  page,
  pageNumber,
  lineHeightPx,
  isBookmarked,
  empty = false,
  fullPage = false,
  fontSizePx = DEFAULT_FONT_SIZE_PX,
}: {
  page: StoryPage | null
  pageNumber: number
  lineHeightPx: number
  isBookmarked: boolean
  empty?: boolean
  fullPage?: boolean
  fontSizePx?: number
}) {
  const lineCount = page?.lines.length ?? LINES_PER_PAGE
  const lines = page?.lines ?? Array.from({ length: lineCount }, () => '')
  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-1 flex-col overflow-hidden px-6 py-4',
        fullPage && 'book-paper rounded-lg border border-stone-200/70',
        !fullPage && 'bg-gradient-to-b from-amber-50 to-orange-50/30',
        isBookmarked && 'ring-2 ring-inset ring-[var(--color-primary)]/50',
        empty && 'opacity-30',
      )}
    >
      <div
        className={cn(
          'shrink-0 text-center',
          page?.isChapterTitlePage
            ? 'flex min-h-0 flex-1 flex-col items-center justify-center'
            : 'mb-2 border-b border-stone-200/70 pb-2',
        )}
      >
        {page?.chapterTitle ? (
          <h2
            className={cn(
              'font-serif font-bold leading-tight text-stone-900',
              page.isChapterTitlePage ? 'text-2xl md:text-3xl' : 'mb-1 text-base',
            )}
          >
            {page.chapterTitle}
          </h2>
        ) : null}
        {!page?.isChapterTitlePage ? (
          <div className="text-[10px] uppercase tracking-widest text-stone-400">
            {empty ? '—' : pageNumber}
          </div>
        ) : null}
      </div>
      {!page?.isChapterTitlePage ? (
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden text-stone-800"
          style={{ font: buildFullPageFont(fontSizePx) }}
        >
          {lines.map((line, lineIndex) => (
            <div
              key={`${pageNumber}-${lineIndex}`}
              className="overflow-hidden whitespace-nowrap"
              style={{ height: lineHeightPx, lineHeight: `${lineHeightPx}px` }}
              aria-hidden={!line}
            >
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ReaderToolbar({
  leftPageIndex,
  pagesLength,
  spreadIndex,
  totalSpreads,
  bookmarkPageIndex,
  isBookmarked,
  onGoToSpread,
  onSetBookmark,
  onToggleFullPage,
  isFullPage,
  compact = false,
  usePageNavigation = false,
  speechText = '',
  speechStatus = 'idle',
  speechSupported = false,
  onListen,
  onPause,
  onResume,
  onStop,
}: {
  leftPageIndex: number
  pagesLength: number
  spreadIndex: number
  totalSpreads: number
  bookmarkPageIndex: number | null
  isBookmarked: boolean
  onGoToSpread: (spread: number) => void
  onSetBookmark: (pageIndex: number | null) => void
  onToggleFullPage: () => void
  isFullPage: boolean
  compact?: boolean
  usePageNavigation?: boolean
  speechText?: string
  speechStatus?: SpeechPlaybackStatus
  speechSupported?: boolean
  onListen?: () => void
  onPause?: () => void
  onResume?: () => void
  onStop?: () => void
}) {
  const t = useUiT()
  const rightPageIndex = leftPageIndex + 1
  const pageLabel =
    isFullPage && rightPageIndex < pagesLength
      ? t('reader.pagesRange', { from: leftPageIndex + 1, to: rightPageIndex + 1 })
      : t('reader.pageNumber', { n: leftPageIndex + 1 })

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2',
        compact ? 'px-1 py-1' : 'rounded-xl border bg-white px-4 py-2 shadow-sm',
      )}
    >
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="outline" size="icon" className={compact ? 'h-7 w-7' : undefined} onClick={() => onGoToSpread(0)} disabled={spreadIndex === 0} title={t('reader.firstSpread')}>
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className={compact ? 'h-7 w-7' : undefined} onClick={() => onGoToSpread(spreadIndex - 1)} disabled={spreadIndex === 0} title={t('reader.prevSpread')}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-0 flex-1 text-center text-xs font-medium sm:min-w-[8rem] sm:flex-none">
          {isFullPage ? (
            <>
              {pageLabel} · {t('reader.spreadCounter', { spread: spreadIndex + 1, totalSpreads })}
            </>
          ) : (
            t('reader.pageCounter', { current: leftPageIndex + 1, total: pagesLength })
          )}
        </span>
        <Button variant="outline" size="icon" className={compact ? 'h-7 w-7' : undefined} onClick={() => onGoToSpread(spreadIndex + 1)} disabled={spreadIndex >= totalSpreads - 1} title={t('reader.nextSpread')}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className={compact ? 'h-7 w-7' : undefined} onClick={() => onGoToSpread(totalSpreads - 1)} disabled={spreadIndex >= totalSpreads - 1} title={t('reader.lastSpread')}>
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {onListen && onPause && onResume && onStop ? (
          <ReaderSpeechControls
            text={speechText}
            compact={compact}
            status={speechStatus}
            isSupported={speechSupported}
            onListen={onListen}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
          />
        ) : null}
        {bookmarkPageIndex !== null && !isBookmarked ? (
          <Button
            variant="outline"
            size="sm"
            className={compact ? 'h-7 text-xs' : undefined}
            onClick={() =>
              onGoToSpread(
                usePageNavigation ? bookmarkPageIndex : spreadIndexFromPage(bookmarkPageIndex),
              )
            }
          >
            <Bookmark className="h-3.5 w-3.5 fill-current text-[var(--color-primary)]" />
            {t('reader.pageShort', { n: bookmarkPageIndex + 1 })}
          </Button>
        ) : null}
        <Button
          variant={isBookmarked ? 'default' : 'outline'}
          size="sm"
          className={compact ? 'h-7 text-xs' : undefined}
          onClick={() => onSetBookmark(isBookmarked ? null : leftPageIndex)}
        >
          <Bookmark className={cn('h-3.5 w-3.5', isBookmarked && 'fill-current')} />
          {isBookmarked ? t('reader.saved') : t('reader.bookmark')}
        </Button>
        <Button variant="outline" size="sm" className={compact ? 'h-7 text-xs' : undefined} onClick={onToggleFullPage} title={isFullPage ? t('reader.exitFullPage') : t('reader.fullPageReading')}>
          {isFullPage ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {isFullPage ? t('reader.exit') : t('reader.fullPage')}
        </Button>
      </div>
    </div>
  )
}

function FullPageSpread({
  storyTitle,
  language,
  paragraphs,
  chapters = [],
  paginateOptions,
  spreadIndex,
  bookmarkPageIndex,
  fontSizePx,
  onFontSizeChange,
  onGoToSpread,
  onSetBookmark,
  onClose,
}: {
  storyTitle: string
  language: Language
  paragraphs: Paragraph[]
  chapters?: Chapter[]
  paginateOptions: PaginateOptions
  spreadIndex: number
  bookmarkPageIndex: number | null
  fontSizePx: number
  onFontSizeChange: (size: number) => void
  onGoToSpread: (spread: number) => void
  onSetBookmark: (pageIndex: number | null) => void
  onClose: () => void
}) {
  const t = useUiT()
  const { blindKidMode } = useBlindKidMode()
  const autoReadRef = useRef(false)
  const { layout, lineHeightPx, setContainerRef } = useViewportBookLayout(fontSizePx)
  const { speak, pause, resume, cancel, status, isSupported } = useSpeechSynthesis(language)
  const prevLayoutRef = useRef(layout)
  const pages = useMemo(() => (layout ? paginateStory(paragraphs, paginateOptions, layout, chapters) : []), [paragraphs, paginateOptions, layout, chapters])
  const totalSpreads = spreadCount(pages.length)
  const textPageIndex = spreadIndex * 2

  useEffect(() => {
    if (!layout || !prevLayoutRef.current) {
      prevLayoutRef.current = layout
      return
    }
    if (layoutsEqual(prevLayoutRef.current, layout)) return
    const absoluteLine = spreadIndex * 2 * prevLayoutRef.current.linesPerPage
    const nextSpread = Math.floor(absoluteLine / (2 * layout.linesPerPage))
    const maxSpread = Math.max(0, totalSpreads - 1)
    if (nextSpread !== spreadIndex) onGoToSpread(Math.max(0, Math.min(nextSpread, maxSpread)))
    prevLayoutRef.current = layout
  }, [layout, spreadIndex, totalSpreads, onGoToSpread])

  const leftPage = pages[textPageIndex] ?? null
  const rightPage = pages[textPageIndex + 1] ?? null
  const isBookmarked = bookmarkPageIndex === textPageIndex
  const spreadSpeechText = getSpreadSpeechText(leftPage, rightPage)

  useEffect(() => {
    if (!blindKidMode || !autoReadRef.current) return
    speak(spreadSpeechText)
  }, [blindKidMode, spreadIndex, spreadSpeechText, speak])

  useEffect(() => () => cancel(), [cancel])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onGoToSpread(Math.min(spreadIndex + 1, totalSpreads - 1))
      if (event.key === 'ArrowLeft') onGoToSpread(Math.max(spreadIndex - 1, 0))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [spreadIndex, totalSpreads, onGoToSpread, onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900">
      <div className="flex shrink-0 items-center gap-2 border-b border-stone-700 bg-stone-900/95 px-3 py-1.5 text-stone-100 backdrop-blur-sm">
        <BookOpen className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-100">{storyTitle}</h2>
        <FontSizeControl fontSizePx={fontSizePx} onChange={onFontSizeChange} dark />
        {layout ? (
          <ReaderToolbar
            leftPageIndex={textPageIndex}
            pagesLength={pages.length}
            spreadIndex={spreadIndex}
            totalSpreads={totalSpreads}
            bookmarkPageIndex={bookmarkPageIndex}
            isBookmarked={isBookmarked}
            onGoToSpread={onGoToSpread}
            onSetBookmark={onSetBookmark}
            onToggleFullPage={onClose}
            isFullPage
            compact
            speechText={spreadSpeechText}
            speechStatus={status}
            speechSupported={isSupported}
            onListen={() => {
              autoReadRef.current = true
              speak(spreadSpeechText)
            }}
            onPause={pause}
            onResume={resume}
            onStop={() => {
              autoReadRef.current = false
              cancel()
            }}
          />
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-stone-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('reader.fitting')}
          </span>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-stone-300 hover:bg-stone-800 hover:text-white" onClick={onClose} title={t('reader.closeFullPage')}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-stretch justify-center p-4">
        <div ref={setContainerRef} className="flex h-full w-full max-w-[1400px]" style={{ gap: SPREAD_GAP_PX }}>
          {layout ? (
            <>
              <SpreadPagePanel page={leftPage} pageNumber={textPageIndex + 1} lineHeightPx={lineHeightPx} isBookmarked={bookmarkPageIndex === textPageIndex} fullPage fontSizePx={fontSizePx} />
              <SpreadPagePanel page={rightPage} pageNumber={textPageIndex + 2} lineHeightPx={lineHeightPx} isBookmarked={bookmarkPageIndex === textPageIndex + 1} empty={!rightPage} fullPage fontSizePx={fontSizePx} />
            </>
          ) : null}
        </div>
      </div>
      <p className="shrink-0 border-t border-stone-700 bg-stone-900/95 py-1.5 text-center text-[10px] text-stone-500">{t('reader.navHint')}</p>
    </div>
  )
}

export function StoryBookReader({
  storyId,
  storyTitle,
  language,
  paragraphs,
  chapters = [],
  bookmarkPageIndex,
  onSetBookmark,
  streamingParagraphId,
  streamingContent,
  fillHeight = false,
}: StoryBookReaderProps) {
  const t = useUiT()
  const { blindKidMode } = useBlindKidMode()
  const autoReadRef = useRef(false)
  const { speak, pause, resume, cancel, status, isSupported } = useSpeechSynthesis(language)
  const restoredBookmarkStoryRef = useRef<string | null>(null)
  const paginateOptions = useMemo(() => ({ streamingParagraphId, streamingContent }), [streamingParagraphId, streamingContent])
  const [currentPage, setCurrentPage] = useState(0)
  const [spreadIndex, setSpreadIndex] = useState(0)
  const [isFullPage, setIsFullPage] = useState(false)
  const [fontSizePx, setFontSizePx] = useState(readStoredFontSize)
  const { layout: inlineLayout, lineHeightPx: inlineLineHeight, setContainerRef } = useInlineBookLayout(fontSizePx)
  const lastInlineLayoutRef = useRef(inlineLayout)
  const inlinePages = useMemo(() => paginateStory(paragraphs, paginateOptions, inlineLayout, chapters), [paragraphs, paginateOptions, inlineLayout, chapters])

  useEffect(() => {
    restoredBookmarkStoryRef.current = null
    setCurrentPage(0)
    setSpreadIndex(0)
    setIsFullPage(false)
  }, [storyId])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(0, inlinePages.length - 1)))
  }, [inlinePages.length])

  useEffect(() => {
    if (bookmarkPageIndex === null || inlinePages.length === 0) return
    const layoutChanged = !layoutsEqual(lastInlineLayoutRef.current, inlineLayout)
    lastInlineLayoutRef.current = inlineLayout
    if (restoredBookmarkStoryRef.current === storyId && !layoutChanged) return
    const clamped = Math.min(Math.max(0, bookmarkPageIndex), inlinePages.length - 1)
    restoredBookmarkStoryRef.current = storyId
    setCurrentPage(clamped)
    setSpreadIndex(spreadIndexFromPage(clamped))
  }, [storyId, bookmarkPageIndex, inlinePages.length, inlineLayout])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFullPage) return
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      if (event.key === 'ArrowRight') setCurrentPage((page) => Math.min(page + 1, inlinePages.length - 1))
      if (event.key === 'ArrowLeft') setCurrentPage((page) => Math.max(page - 1, 0))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inlinePages.length, isFullPage])

  useEffect(() => {
    if (!isFullPage) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isFullPage])

  const hasText = paragraphs.some((paragraph) => paragraph.content.trim().length > 0)
  const inlinePage = useMemo(() => {
    if (inlinePages.length === 0) return undefined
    return inlinePages[Math.min(currentPage, inlinePages.length - 1)] ?? inlinePages[0]
  }, [inlinePages, currentPage])
  const inlineSpeechText = useMemo(() => getPageSpeechText(inlinePage), [inlinePage])

  useEffect(() => {
    if (!blindKidMode || !autoReadRef.current || !inlineSpeechText) return
    speak(inlineSpeechText)
  }, [blindKidMode, currentPage, inlineSpeechText, speak])

  useEffect(() => () => cancel(), [cancel])

  const openFullPage = () => {
    setSpreadIndex(spreadIndexFromPage(currentPage))
    setIsFullPage(true)
  }
  const closeFullPage = () => {
    setCurrentPage(spreadIndex * 2)
    setIsFullPage(false)
  }

  if (!hasText && !streamingContent) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-[var(--color-muted-foreground)]">
        {t('reader.storyPlaceholder')}
      </div>
    )
  }

  const inlineBookmarked = bookmarkPageIndex === currentPage
  const inlinePageShell = fillHeight ? 'min-h-0 flex-1' : 'min-h-[min(70dvh,720px)]'

  return (
    <>
      <div className={cn('flex w-full flex-col gap-2', fillHeight && 'min-h-0 flex-1')}>
        <div className="shrink-0">
          <ReaderToolbar
            leftPageIndex={currentPage}
            pagesLength={inlinePages.length}
            spreadIndex={currentPage}
            totalSpreads={inlinePages.length}
            bookmarkPageIndex={bookmarkPageIndex}
            isBookmarked={inlineBookmarked}
            onGoToSpread={setCurrentPage}
            onSetBookmark={onSetBookmark}
            onToggleFullPage={openFullPage}
            isFullPage={false}
            usePageNavigation
            speechText={inlineSpeechText}
            speechStatus={status}
            speechSupported={isSupported}
            onListen={() => {
              autoReadRef.current = true
              speak(inlineSpeechText)
            }}
            onPause={pause}
            onResume={resume}
            onStop={() => {
              autoReadRef.current = false
              cancel()
            }}
          />
        </div>
        <div ref={setContainerRef} className={cn('w-full min-w-0', fillHeight ? 'min-h-0 flex-1' : inlinePageShell)}>
          {inlinePage ? (
            <InlineBookPage
              page={inlinePage}
              pageNumber={currentPage + 1}
              isBookmarked={inlineBookmarked}
              lineHeightPx={inlineLineHeight}
              fontSizePx={fontSizePx}
            />
          ) : (
            <div className="flex h-full min-h-[12rem] items-center justify-center text-[var(--color-muted-foreground)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
        <p className="text-center text-[10px] text-[var(--color-muted-foreground)]">{t('reader.fullScreenHint')}</p>
      </div>

      {isFullPage
        ? createPortal(
            <FullPageSpread
              storyTitle={storyTitle}
              language={language}
              paragraphs={paragraphs}
              chapters={chapters}
              paginateOptions={paginateOptions}
              spreadIndex={spreadIndex}
              bookmarkPageIndex={bookmarkPageIndex}
              fontSizePx={fontSizePx}
              onFontSizeChange={setFontSizePx}
              onGoToSpread={setSpreadIndex}
              onSetBookmark={onSetBookmark}
              onClose={closeFullPage}
            />,
            document.body,
          )
        : null}
    </>
  )
}
