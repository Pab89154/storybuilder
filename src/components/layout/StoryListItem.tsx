import { useState, type HTMLAttributes } from 'react'
import { Book, BookOpen, FolderInput, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatRelativeTime, cn } from '@/lib/utils'
import { languageFlag, languageLabel } from '@/lib/language'
import { useUiT } from '@/i18n/context'
import { buttonVariants } from '@/components/ui/button'
import type { Folder, Story } from '@/types/story'

interface StoryListItemProps {
  story: Story
  folders: Folder[]
  isActive: boolean
  inCollection?: boolean
  sortable?: boolean
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>
  onLoad: (storyId: string) => void
  onRename: (storyId: string, title: string) => void
  onMove: (storyId: string, folderId: string | null) => void
  onDelete: (storyId: string) => void
}

export function StoryListItem({
  story,
  folders,
  isActive,
  inCollection = false,
  sortable = false,
  dragHandleProps,
  onLoad,
  onRename,
  onMove,
  onDelete,
}: StoryListItemProps) {
  const t = useUiT()
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(story.title)

  const collectionName = story.folderId
    ? folders.find((f) => f.id === story.folderId)?.name ?? t('storyList.unknownCollection')
    : null

  const commitRename = async () => {
    const next = renameValue.trim() || t('storyList.untitled')
    if (next !== story.title) {
      onRename(story.id, next)
    }
    setIsRenaming(false)
  }

  const relativeTime = formatRelativeTime(story.updatedAt, t)
  const metadata = [
    collectionName ?? t('storyList.uncategorized'),
    story.genre || null,
    relativeTime,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className={cn(
        inCollection && 'ml-3 border-l-2 border-[var(--color-primary)]/25 pl-2',
      )}
    >
      <div
        className={cn(
          'group w-full min-w-0 overflow-hidden rounded-lg border border-transparent transition-colors',
          isActive
            ? 'border-[var(--color-primary)]/20 bg-[var(--color-sidebar-accent)]'
            : 'hover:border-[var(--color-border)] hover:bg-[var(--color-sidebar-accent)]/60',
        )}
      >
      <div className="flex min-w-0 items-start gap-0.5 px-2 pt-2">
        {sortable && dragHandleProps ? (
          <button
            type="button"
            className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-[var(--color-muted-foreground)] opacity-50 hover:opacity-100 active:cursor-grabbing"
            title={t('storyList.dragToReorder')}
            aria-label={t('storyList.dragToReorder')}
            onClick={(e) => e.stopPropagation()}
            {...dragHandleProps}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1 overflow-hidden">
          {isRenaming ? (
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => void commitRename()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void commitRename()
                if (e.key === 'Escape') {
                  setRenameValue(story.title)
                  setIsRenaming(false)
                }
              }}
              className="h-7 w-full text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <button
              type="button"
              className="w-full min-w-0 overflow-hidden text-left"
              onClick={() => onLoad(story.id)}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {isActive ? (
                  <BookOpen
                    className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]"
                    aria-hidden
                  />
                ) : (
                  <Book
                    className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]"
                    aria-hidden
                  />
                )}
                <span
                  className="shrink-0 text-base leading-none"
                  title={languageLabel(story.language)}
                  aria-label={languageLabel(story.language)}
                >
                  {languageFlag(story.language)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{story.title}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]" title={metadata}>
                {metadata}
              </p>
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100"
            title={t('storyList.renameStory')}
            onClick={(e) => {
              e.stopPropagation()
              setRenameValue(story.title)
              setIsRenaming(true)
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-3.5 w-3.5 text-[var(--color-destructive)]" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('storyList.deleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('storyList.deleteDescription', { title: story.title })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex justify-end gap-2">
                <AlertDialogCancel>{t('sidebar.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: 'destructive' })}
                  onClick={() => onDelete(story.id)}
                >
                  {t('sidebar.delete')}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 px-2 pb-2 pt-1">
        <FolderInput className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
        <div className="min-w-0 flex-1">
          <Select
            value={story.folderId ?? 'none'}
            onValueChange={(value) => onMove(story.id, value === 'none' ? null : value)}
          >
            <SelectTrigger
              className="h-7 w-full min-w-0 px-2 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue placeholder={t('storyList.moveToCollection')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('storyList.uncategorizedOption')}</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
    </div>
  )
}
