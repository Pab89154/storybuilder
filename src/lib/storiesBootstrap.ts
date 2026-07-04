import { ensureDbStartupInit } from '@/lib/dbStartup'

let bootstrapPromise: Promise<void> | null = null

/** Loads story list once per session, no matter how many components call useStories(). */
export function ensureStoriesBootstrapped(refreshStories: () => Promise<void>): void {
  if (bootstrapPromise) return
  bootstrapPromise = refreshStories()
    .then(() => ensureDbStartupInit())
    .then(() => refreshStories())
}
