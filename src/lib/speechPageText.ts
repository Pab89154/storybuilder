import type { StoryPage } from '@/lib/storyPagination'

export function getPageSpeechText(page: StoryPage | null | undefined): string {
  if (!page) return ''
  return page.lines.filter(Boolean).join(' ').trim()
}

export function getSpreadSpeechText(
  leftPage: StoryPage | null | undefined,
  rightPage: StoryPage | null | undefined,
): string {
  return [getPageSpeechText(leftPage), getPageSpeechText(rightPage)].filter(Boolean).join(' ')
}
