import { reindexAllStories } from '@/db/database'

let startupInitPromise: Promise<void> | null = null

/** Runs full-library search reindex once per app session. */
export function ensureDbStartupInit(): Promise<void> {
  if (!startupInitPromise) {
    startupInitPromise = reindexAllStories()
  }
  return startupInitPromise
}
