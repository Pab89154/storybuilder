import { useEffect, useState } from 'react'
import { Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { deleteParagraph, updateParagraph } from '@/db/database'
import { useStories } from '@/hooks/useStories'
import { useGeneration } from '@/hooks/useGeneration'
import { useStoryStore } from '@/store/storyStore'
import { useUiT } from '@/i18n/context'
import { cn } from '@/lib/utils'
import type { Paragraph } from '@/types/story'

interface ParagraphBlockProps {
  paragraph: Paragraph
  /** flow = continuous prose; card = bordered block (legacy) */
  variant?: 'flow' | 'card'
}

export function ParagraphBlock({ paragraph, variant = 'card' }: ParagraphBlockProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(paragraph.content)
  const { activeStory, loadStory } = useStories()
  const { regenerate, isGenerating } = useGeneration()
  const { streamingParagraphId, streamingContent, isGenerating: generating } = useStoryStore()
  const t = useUiT()

  const isStreaming = streamingParagraphId === paragraph.id && generating
  const displayContent = isStreaming ? streamingContent || paragraph.content : paragraph.content

  useEffect(() => {
    if (!isEditing) setEditContent(paragraph.content)
  }, [paragraph.content, isEditing])

  const handleSave = async () => {
    if (!activeStory) return
    await updateParagraph(paragraph.id, { content: editContent, source: 'user' })
    await loadStory(activeStory.id, { onlyIfStillActive: true })
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!activeStory) return
    await deleteParagraph(paragraph.id)
    await loadStory(activeStory.id, { onlyIfStillActive: true })
  }

  const isFlow = variant === 'flow'

  return (
    <div
      id={`paragraph-${paragraph.id}`}
      className={cn(
        'group/para relative',
        isFlow
          ? cn(
              'mb-4 last:mb-0',
              isStreaming && 'rounded-md bg-[var(--color-primary)]/5 px-1 -mx-1',
            )
          : cn(
              'rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
              isStreaming && 'ring-2 ring-[var(--color-primary)]/30',
            ),
      )}
    >
      {!isEditing ? (
        <div
          className={cn(
            'flex justify-end gap-0.5',
            isFlow
              ? 'absolute -right-1 top-0 z-10 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/para:opacity-100 sm:group-focus-within/para:opacity-100'
              : 'mb-2',
          )}
        >
            <Button
              variant="ghost"
              size="icon"
              className={cn(isFlow && 'h-7 w-7 bg-white/90 shadow-sm')}
              disabled={isGenerating}
              onClick={() => void regenerate(paragraph.id)}
              title={t('paragraph.regenerate')}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(isFlow && 'h-7 w-7 bg-white/90 shadow-sm')}
              onClick={() => {
                setEditContent(paragraph.content)
                setIsEditing(true)
              }}
              title={t('paragraph.edit')}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(isFlow && 'h-7 w-7 bg-white/90 shadow-sm')}
              onClick={() => void handleDelete()}
              title={t('paragraph.delete')}
            >
              <Trash2 className="h-3.5 w-3.5 text-[var(--color-destructive)]" />
            </Button>
        </div>
      ) : null}

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={6}
            className="min-h-[120px]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void handleSave()}>
              {t('paragraph.save')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditContent(paragraph.content)
                setIsEditing(false)
              }}
            >
              {t('paragraph.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <p
          className={cn(
            'whitespace-pre-wrap text-[var(--color-foreground)]',
            isFlow ? 'text-base leading-[1.75]' : 'leading-relaxed',
            isStreaming && 'streaming-cursor',
          )}
        >
          {displayContent}
        </p>
      )}
    </div>
  )
}
