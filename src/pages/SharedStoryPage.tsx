import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { StoryBookReader } from '@/components/story/StoryBookReader'
import { Button } from '@/components/ui/button'
import { IconBookOpen, IconPencil } from '@/components/icons/AppIcons'
import { useUiT } from '@/i18n/context'
import { loadSharedStory, readShareSecretFromHash, saveSharedStory } from '@/lib/cloud/sharing'
import type { ShareAccessMode } from '@/types/share'
import type { StoryWithDetails } from '@/types/story'
import { cn } from '@/lib/utils'

type ViewMode = 'read' | 'edit'

export function SharedStoryPage() {
  const t = useUiT()
  const { token } = useParams()
  const [story, setStory] = useState<StoryWithDetails | null>(null)
  const [shareId, setShareId] = useState<string | null>(null)
  const [accessMode, setAccessMode] = useState<ShareAccessMode>('view')
  const [viewMode, setViewMode] = useState<ViewMode>('read')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const shareSecret = readShareSecretFromHash()

  useEffect(() => {
    if (!token || !shareSecret) {
      setError(t('share.missingKey'))
      return
    }
    void loadSharedStory(token, shareSecret)
      .then((result) => {
        if (!result) {
          setError(t('share.notFound'))
          return
        }
        setStory(result.story)
        setShareId(result.shareId)
        setAccessMode(result.accessMode)
        setViewMode(result.accessMode === 'edit' ? 'edit' : 'read')
      })
      .catch(() => setError(t('share.notFound')))
  }, [token, shareSecret, t])

  const handleSave = async () => {
    if (!story || !shareId || !shareSecret || accessMode !== 'edit') return
    setIsSaving(true)
    try {
      await saveSharedStory(shareId, story, shareSecret)
    } catch {
      setError(t('share.error'))
    } finally {
      setIsSaving(false)
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-[var(--color-muted-foreground)]">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{story.title}</h1>
        <div className="flex rounded-lg border">
          <button
            type="button"
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm',
              viewMode === 'read' && 'bg-[var(--color-primary)] text-white',
            )}
            onClick={() => setViewMode('read')}
          >
            <IconBookOpen className="h-4 w-4" />
            {t('workspace.read')}
          </button>
          {accessMode === 'edit' ? (
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5 border-l px-3 py-2 text-sm',
                viewMode === 'edit' && 'bg-[var(--color-primary)] text-white',
              )}
              onClick={() => setViewMode('edit')}
            >
              <IconPencil className="h-4 w-4" />
              {t('workspace.edit')}
            </button>
          ) : null}
        </div>
        {accessMode === 'edit' ? (
          <Button disabled={isSaving} onClick={() => void handleSave()}>
            {t('share.saveShared')}
          </Button>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        {viewMode === 'read' ? (
          <StoryBookReader
            storyId={story.id}
            storyTitle={story.title}
            language={story.language}
            genre={story.genre}
            storyPrompt={story.prompt}
            readerAge={story.readerAge}
            paragraphs={story.paragraphs}
            chapters={story.chapters}
            bookmarkPageIndex={story.bookmarkPageIndex}
            onSetBookmark={() => {}}
          />
        ) : (
          <div className="space-y-4">
            {story.paragraphs.map((paragraph) => (
              <textarea
                key={paragraph.id}
                className="min-h-28 w-full rounded-lg border bg-[var(--color-card)] p-3 text-sm"
                value={paragraph.content}
                onChange={(event) => {
                  const content = event.target.value
                  setStory((current) =>
                    current
                      ? {
                          ...current,
                          paragraphs: current.paragraphs.map((item) =>
                            item.id === paragraph.id ? { ...item, content } : item,
                          ),
                        }
                      : current,
                  )
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
