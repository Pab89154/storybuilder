import { useCallback, useEffect, useRef, useState } from 'react'
import type { PaginationLayout } from '@/lib/storyPagination'
import { CHARS_PER_LINE, DEFAULT_PAGINATION_LAYOUT, LINES_PER_PAGE } from '@/lib/storyPagination'

export const DEFAULT_FONT_SIZE_PX = 17
export const MIN_FONT_SIZE_PX = 13
export const MAX_FONT_SIZE_PX = 26
export const SPREAD_GAP_PX = 20

const MIN_LINES_PER_PAGE = 5
const PAGE_HEADER_PX = 36
const PAGE_FOOTER_PX = 8
const PAGE_HORIZONTAL_PADDING = 48
/** Inline reader horizontal padding (px-4 / px-6 / px-8 each side). */
function inlineHorizontalPadding(containerWidth: number): number {
  if (containerWidth < 640) return 32
  if (containerWidth < 768) return 48
  return 64
}

function inlineVerticalPadding(containerWidth: number): number {
  if (containerWidth < 640) return 40
  return 48
}
const LINE_HEIGHT_RATIO = 1.45

export function buildFullPageFont(fontSizePx: number): string {
  return `${fontSizePx}px Georgia, "Times New Roman", ui-serif, serif`
}

export function lineHeightForFont(fontSizePx: number): number {
  return Math.max(fontSizePx + 6, Math.round(fontSizePx * LINE_HEIGHT_RATIO))
}

export function measureCharsPerLine(widthPx: number, fontSizePx: number): number {
  if (widthPx <= 20) return CHARS_PER_LINE

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return CHARS_PER_LINE

  context.font = buildFullPageFont(fontSizePx)
  const sample = 'The quick brown fox jumps over the lazy dog. '
  const sampleWidth = context.measureText(sample).width
  if (sampleWidth <= 0) return CHARS_PER_LINE

  const averageCharWidth = sampleWidth / sample.length
  return Math.max(20, Math.floor(widthPx / averageCharWidth))
}

export function computeLayoutFromViewport(
  pageBodyWidth: number,
  pageBodyHeight: number,
  fontSizePx: number,
): { layout: PaginationLayout; lineHeightPx: number } {
  const lineHeightPx = lineHeightForFont(fontSizePx)
  const linesPerPage = Math.max(MIN_LINES_PER_PAGE, Math.floor(pageBodyHeight / lineHeightPx))

  return {
    layout: {
      linesPerPage,
      charsPerLine: measureCharsPerLine(pageBodyWidth, fontSizePx),
    },
    lineHeightPx: Math.floor(pageBodyHeight / linesPerPage),
  }
}

type BookLayoutMode = 'spread' | 'single'

function measureElement(element: HTMLElement, fontSizePx: number, mode: BookLayoutMode) {
  const height = element.clientHeight
  const width = element.clientWidth
  if (height <= 0 || width <= 0) return null

  const horizontalPad =
    mode === 'single' ? inlineHorizontalPadding(width) : PAGE_HORIZONTAL_PADDING
  const verticalPad = mode === 'single' ? inlineVerticalPadding(width) : 0

  const pageBodyHeight = height - PAGE_HEADER_PX - PAGE_FOOTER_PX - verticalPad
  const pageBodyWidth =
    mode === 'single'
      ? width - horizontalPad
      : (width - SPREAD_GAP_PX) / 2 - horizontalPad

  if (pageBodyHeight <= 0 || pageBodyWidth <= 0) return null

  return computeLayoutFromViewport(pageBodyWidth, pageBodyHeight, fontSizePx)
}

function useBookLayout(fontSizePx: number, mode: BookLayoutMode) {
  const [layout, setLayout] = useState<PaginationLayout>(DEFAULT_PAGINATION_LAYOUT)
  const [lineHeightPx, setLineHeightPx] = useState(lineHeightForFont(fontSizePx))
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null)
  const layoutRef = useRef<PaginationLayout>(DEFAULT_PAGINATION_LAYOUT)
  const lineHeightRef = useRef(lineHeightForFont(fontSizePx))
  const lastSizeRef = useRef({ width: 0, height: 0 })

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerNode(node)
  }, [])

  useEffect(() => {
    if (!containerNode) return

    let debounceId: ReturnType<typeof setTimeout> | null = null
    let rafId: number | null = null

    const applyMeasure = () => {
      const height = containerNode.clientHeight
      const width = containerNode.clientWidth
      if (height <= 0 || width <= 0) return

      if (
        Math.abs(lastSizeRef.current.width - width) < 3 &&
        Math.abs(lastSizeRef.current.height - height) < 3
      ) {
        return
      }
      lastSizeRef.current = { width, height }

      const result = measureElement(containerNode, fontSizePx, mode)
      if (!result) return

      const { layout: nextLayout, lineHeightPx: nextLineHeight } = result
      if (
        layoutsEqual(layoutRef.current, nextLayout) &&
        lineHeightRef.current === nextLineHeight
      ) {
        return
      }

      layoutRef.current = nextLayout
      lineHeightRef.current = nextLineHeight
      setLayout(nextLayout)
      setLineHeightPx(nextLineHeight)
    }

    const scheduleMeasure = () => {
      if (debounceId) clearTimeout(debounceId)
      debounceId = setTimeout(() => {
        debounceId = null
        if (rafId !== null) window.cancelAnimationFrame(rafId)
        rafId = window.requestAnimationFrame(applyMeasure)
      }, 300)
    }

    applyMeasure()

    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(containerNode)

    return () => {
      if (debounceId) clearTimeout(debounceId)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [containerNode, fontSizePx, mode])

  return { layout, lineHeightPx, setContainerRef }
}

export function useViewportBookLayout(fontSizePx: number) {
  return useBookLayout(fontSizePx, 'spread')
}

export function useInlineBookLayout(fontSizePx: number) {
  return useBookLayout(fontSizePx, 'single')
}

export function spreadCount(pageCount: number): number {
  return Math.max(1, Math.ceil(pageCount / 2))
}

export function spreadIndexFromPage(pageIndex: number): number {
  return Math.floor(pageIndex / 2)
}

export function layoutsEqual(a: PaginationLayout | null, b: PaginationLayout | null): boolean {
  if (!a || !b) return a === b
  return a.linesPerPage === b.linesPerPage && a.charsPerLine === b.charsPerLine
}

export { LINES_PER_PAGE as FALLBACK_LINES_PER_PAGE }
