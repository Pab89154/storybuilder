import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo, useState, type ReactNode } from 'react'
import { StoryListItem } from '@/components/layout/StoryListItem'
import {
  containerIdFromFolderId,
  folderIdFromContainerId,
  isContainerId,
  UNCATEGORIZED_KEY,
} from '@/lib/folderContainers'
import { cn } from '@/lib/utils'
import { useUiT } from '@/i18n/context'
import type { Folder, Story } from '@/types/story'

interface StoryListItemConfig {
  story: Story
  folders: Folder[]
  isActive: boolean
  inCollection?: boolean
  onLoad: (storyId: string) => void
  onRename: (storyId: string, title: string) => void
  onMove: (storyId: string, folderId: string | null) => void
  onDelete: (storyId: string) => void
}

export interface StoryGroupConfig {
  folder: Folder | null
  stories: Story[]
  groupKey: string
  inCollection: boolean
  showHeader: boolean
  isCollapsed: boolean
  header: ReactNode
}

interface SidebarStoryDnDProps {
  groups: StoryGroupConfig[]
  draggable: boolean
  getStoryProps: (story: Story, inCollection: boolean) => StoryListItemConfig
  onMoveStoryToPosition: (
    storyId: string,
    targetFolderId: string | null,
    targetIndex: number,
  ) => void
  onExpandGroup: (groupKey: string) => void
}

function SortableStoryRow({
  story,
  itemProps,
}: {
  story: Story
  itemProps: StoryListItemConfig
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: story.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && 'relative z-10 opacity-50')}
    >
      <StoryListItem
        {...itemProps}
        sortable
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function DroppableStoryGroup({
  folderId,
  draggable,
  isCollapsed,
  showHeader,
  header,
  stories,
  inCollection,
  getStoryProps,
}: {
  folderId: string | null
  draggable: boolean
  isCollapsed: boolean
  showHeader: boolean
  header: ReactNode
  stories: Story[]
  inCollection: boolean
  getStoryProps: (story: Story, inCollection: boolean) => StoryListItemConfig
}) {
  const t = useUiT()
  const containerId = containerIdFromFolderId(folderId)
  const { setNodeRef, isOver } = useDroppable({
    id: containerId,
    disabled: !draggable,
  })

  const showStories = !showHeader || !isCollapsed

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg transition-colors',
        draggable && isOver && 'bg-[var(--color-primary)]/8 ring-1 ring-[var(--color-primary)]/30',
      )}
    >
      {showHeader ? header : null}
      {showStories ? (
        <div className={cn('space-y-1', inCollection && showHeader && 'pt-0.5')}>
          {stories.length === 0 ? (
            <div
              className={cn(
                'mx-1 min-h-10 rounded-md border border-dashed px-3 py-2 text-xs text-[var(--color-muted-foreground)]',
                inCollection && 'ml-3',
                draggable && isOver && 'border-[var(--color-primary)]/50 text-[var(--color-primary)]',
              )}
            >
              {draggable ? t('sidebar.dropStoryHere') : t('sidebar.emptyGroup')}
            </div>
          ) : (
            stories.map((story) =>
              draggable ? (
                <SortableStoryRow
                  key={story.id}
                  story={story}
                  itemProps={getStoryProps(story, inCollection)}
                />
              ) : (
                <StoryListItem
                  key={story.id}
                  {...getStoryProps(story, inCollection)}
                />
              ),
            )
          )}
        </div>
      ) : null}
      {draggable && isCollapsed && showHeader && isOver ? (
        <p className="px-3 pb-2 text-xs text-[var(--color-primary)]">{t('sidebar.releaseToMoveHere')}</p>
      ) : null}
    </div>
  )
}

export function SidebarStoryDnD({
  groups,
  draggable,
  getStoryProps,
  onMoveStoryToPosition,
  onExpandGroup,
}: SidebarStoryDnDProps) {
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null)

  const storyById = useMemo(() => {
    const map = new Map<string, Story>()
    for (const group of groups) {
      for (const story of group.stories) {
        map.set(story.id, story)
      }
    }
    return map
  }, [groups])

  const allStoryIds = useMemo(
    () => groups.flatMap((group) => group.stories.map((story) => story.id)),
    [groups],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const getGroupStories = (folderId: string | null) =>
    groups.find((group) => (group.folder?.id ?? null) === folderId)?.stories ??
    groups.find((group) => group.groupKey === UNCATEGORIZED_KEY)?.stories ??
    []

  const handleDragStart = (event: DragStartEvent) => {
    setActiveStoryId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) return

    const overId = String(over.id)
    if (isContainerId(overId)) {
      const folderId = folderIdFromContainerId(overId)
      const groupKey = folderId ?? UNCATEGORIZED_KEY
      onExpandGroup(groupKey)
      return
    }

    const overStory = storyById.get(overId)
    if (!overStory) return
    const groupKey = overStory.folderId ?? UNCATEGORIZED_KEY
    onExpandGroup(groupKey)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStoryId(null)
    if (!draggable) return

    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeStory = storyById.get(activeId)
    if (!activeStory) return

    if (isContainerId(overId)) {
      const targetFolderId = folderIdFromContainerId(overId)
      const targetStories = getGroupStories(targetFolderId)
      onMoveStoryToPosition(activeId, targetFolderId, targetStories.length)
      return
    }

    const overStory = storyById.get(overId)
    if (!overStory) return

    const targetFolderId = overStory.folderId ?? null
    const targetStories = getGroupStories(targetFolderId)
    const targetIndex = targetStories.findIndex((story) => story.id === overId)
    if (targetIndex === -1) return

    onMoveStoryToPosition(activeId, targetFolderId, targetIndex)
  }

  const activeStory = activeStoryId ? storyById.get(activeStoryId) : null
  const activeStoryProps = activeStory
    ? getStoryProps(
        activeStory,
        Boolean(activeStory.folderId),
      )
    : null

  const content = groups.map((group) => (
    <div
      key={group.groupKey}
      className="mb-2 min-w-0 overflow-hidden"
    >
      <DroppableStoryGroup
        folderId={group.folder?.id ?? null}
        draggable={draggable}
        isCollapsed={group.isCollapsed}
        showHeader={group.showHeader}
        header={group.header}
        stories={group.stories}
        inCollection={group.inCollection}
        getStoryProps={getStoryProps}
      />
    </div>
  ))

  if (!draggable) {
    return <>{content}</>
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveStoryId(null)}
    >
      <SortableContext items={allStoryIds} strategy={verticalListSortingStrategy}>
        {content}
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeStory && activeStoryProps ? (
          <div className="w-[18rem] rotate-1 opacity-95 shadow-lg">
            <StoryListItem {...activeStoryProps} sortable dragHandleProps={{}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
