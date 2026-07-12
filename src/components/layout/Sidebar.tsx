import { useEffect, useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, FolderPlus, Library, MessageSquare, PanelLeft, PanelLeftClose, SlidersHorizontal } from 'lucide-react'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { GuestRegisterPrompt } from '@/components/auth/GuestRegisterPrompt'
import { IconLogOut, IconPencil, IconPlus, IconSearch, IconTrash, IconUser } from '@/components/icons/AppIcons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { SidebarStoryDnD, type StoryGroupConfig } from '@/components/layout/SidebarStoryDnD'
import { BlindKidModeToggle } from '@/components/layout/BlindKidModeToggle'
import { NightModeToggle } from '@/components/layout/NightModeToggle'
import { UiLanguageSwitcher } from '@/components/layout/UiLanguageSwitcher'
import { FeedbackDialog } from '@/components/layout/FeedbackDialog'
import { NewStoryDialog } from '@/components/story/NewStoryDialog'
import { LanguageFilterSelect } from '@/components/story/LanguageSelect'
import { useUiT } from '@/i18n/context'
import { useAuth } from '@/context/auth'
import { cancelGenerationIfActive } from '@/hooks/useGeneration'
import { useStories } from '@/hooks/useStories'
import { UNCATEGORIZED_KEY } from '@/lib/folderContainers'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import type { Folder, Story } from '@/types/story'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const t = useUiT()
  const { isAuthenticated, signOut } = useAuth()
  const {
    stories,
    storiesByFolder,
    folders,
    availableGenres,
    activeStoryId,
    searchQuery,
    genreFilter,
    languageFilter,
    folderFilter,
    setSearchQuery,
    setGenreFilter,
    setLanguageFilter,
    setFolderFilter,
    createNewStory,
    addFolder,
    renameFolder,
    removeFolder,
    loadStory,
    renameStory,
    moveStory,
    removeStory,
    moveStoryToPosition,
  } = useStories()

  const canDrag =
    !searchQuery.trim() && genreFilter === 'all' && languageFilter === 'all'

  const activeFilterCount = [
    languageFilter !== 'all',
    genreFilter !== 'all',
    folderFilter !== 'all',
  ].filter(Boolean).length

  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showNewStory, setShowNewStory] = useState(false)
  const [showGuestPrompt, setShowGuestPrompt] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authDialogMode, setAuthDialogMode] = useState<'signIn' | 'signUp' | 'forgot'>('signUp')
  const [showFeedback, setShowFeedback] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})
  const [highlightFolderId, setHighlightFolderId] = useState<string | null>(null)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)

  const toggleFolder = (groupKey: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    const folder = await addFolder(newFolderName.trim())
    setFolderFilter('all')
    setCollapsedFolders((prev) => ({ ...prev, [folder.id]: false }))
    setHighlightFolderId(folder.id)
    setEditingFolderId(folder.id)
    setNewFolderName('')
    setShowNewFolder(false)
    window.setTimeout(() => setHighlightFolderId(null), 2000)
  }

  const activeFolder =
    folderFilter !== 'all' && folderFilter !== 'uncategorized'
      ? folders.find((f) => f.id === folderFilter)
      : null

  const storyItemProps = (story: Story, inCollection = false) => ({
    story,
    folders,
    isActive: activeStoryId === story.id,
    inCollection,
    onLoad: (id: string) => {
      if (id !== activeStoryId) {
        cancelGenerationIfActive()
      }
      void loadStory(id)
      if (!collapsed && window.matchMedia('(max-width: 767px)').matches) {
        onToggleCollapsed()
      }
    },
    onRename: (id: string, title: string) => void renameStory(id, title),
    onMove: (id: string, folderId: string | null) => void moveStory(id, folderId),
    onDelete: (id: string) => void removeStory(id),
  })

  const expandGroup = (groupKey: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [groupKey]: false }))
  }

  const buildCollectionHeader = (
    folder: Folder | null,
    groupStories: Story[],
    groupKey: string,
    collapsible: boolean,
  ) => (
    <CollectionHeader
      folder={folder}
      storyCount={groupStories.length}
      isCollapsed={collapsedFolders[groupKey] ?? false}
      collapsible={collapsible}
      isEditing={folder ? editingFolderId === folder.id : false}
      onToggleCollapse={() => toggleFolder(groupKey)}
      onStartEdit={() => folder && setEditingFolderId(folder.id)}
      onFinishEdit={() => setEditingFolderId(null)}
      onRename={(id, name) => void renameFolder(id, name)}
      onDelete={(id) => void removeFolder(id)}
      uncategorizedLabel={t('sidebar.uncategorized')}
    />
  )

  const storyGroups: StoryGroupConfig[] = (() => {
    if (folderFilter === 'all') {
      const groups: StoryGroupConfig[] = folders.map((folder) => {
        const groupKey = folder.id
        const groupStories = storiesByFolder.get(folder.id) ?? []
        return {
          folder,
          stories: groupStories,
          groupKey,
          inCollection: true,
          showHeader: true,
          isCollapsed: collapsedFolders[groupKey] ?? false,
          header: buildCollectionHeader(folder, groupStories, groupKey, true),
        }
      })
      const uncategorized = storiesByFolder.get(null) ?? []
      groups.push({
        folder: null,
        stories: uncategorized,
        groupKey: UNCATEGORIZED_KEY,
        inCollection: false,
        showHeader: true,
        isCollapsed: collapsedFolders[UNCATEGORIZED_KEY] ?? false,
        header: buildCollectionHeader(null, uncategorized, UNCATEGORIZED_KEY, true),
      })
      return groups
    }

    if (folderFilter === 'uncategorized') {
      const groupStories = storiesByFolder.get(null) ?? []
      return [
        {
          folder: null,
          stories: groupStories,
          groupKey: UNCATEGORIZED_KEY,
          inCollection: false,
          showHeader: true,
          isCollapsed: collapsedFolders[UNCATEGORIZED_KEY] ?? false,
          header: buildCollectionHeader(null, groupStories, UNCATEGORIZED_KEY, true),
        },
      ]
    }

    if (activeFolder) {
      return [
        {
          folder: activeFolder,
          stories,
          groupKey: activeFolder.id,
          inCollection: true,
          showHeader: true,
          isCollapsed: false,
          header: buildCollectionHeader(activeFolder, stories, activeFolder.id, false),
        },
      ]
    }

    return []
  })()

  const openNewStoryFlow = () => {
    if (!isAuthenticated) {
      setShowGuestPrompt(true)
      return
    }
    setShowNewStory(true)
  }

  const newStoryDialog = (
    <NewStoryDialog
      open={showNewStory}
      onOpenChange={setShowNewStory}
      onCreate={(language, readerAge) => {
        void createNewStory(language, readerAge)
      }}
    />
  )

  const guestPrompt = (
    <GuestRegisterPrompt
      open={showGuestPrompt}
      onOpenChange={setShowGuestPrompt}
      onContinueGuest={() => {
        setShowGuestPrompt(false)
        setShowNewStory(true)
      }}
      onRegister={() => {
        setShowGuestPrompt(false)
        setAuthDialogMode('signUp')
        setShowAuthDialog(true)
      }}
    />
  )

  const authDialog = (
    <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} initialMode={authDialogMode} />
  )

  const feedbackDialog = (
    <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} />
  )

  const openNewCollection = () => {
    setShowNewFolder(true)
    if (collapsed) onToggleCollapsed()
  }

  const collapsedRail = (
    <div
      className={cn(
        'absolute inset-y-0 left-0 z-10 flex w-14 flex-col items-center gap-2 border-r bg-[var(--color-sidebar)] pb-4 pt-6',
        collapsed ? 'flex' : 'hidden',
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={onToggleCollapsed}
        title={t('sidebar.expand')}
        aria-label={t('sidebar.expand')}
      >
        <PanelLeft className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-[var(--color-primary)] hover:text-[var(--color-primary)]"
        onClick={openNewStoryFlow}
        title={t('sidebar.newStory')}
        aria-label={t('sidebar.newStory')}
      >
        <IconPlus className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={openNewCollection}
        title={t('sidebar.collection')}
        aria-label={t('sidebar.collection')}
      >
        <FolderPlus className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => setShowFeedback(true)}
        title={t('feedback.button')}
        aria-label={t('feedback.button')}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
      <BlindKidModeToggle size="rail" />
      <NightModeToggle size="rail" />
    </div>
  )

  return (
    <>
      <aside
        aria-label={collapsed ? t('sidebar.libraryCollapsed') : t('app.name')}
        className={cn(
          'relative flex h-full shrink-0 overflow-hidden border-r bg-[var(--color-sidebar)]',
          'transition-[width,transform,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
          collapsed ? 'w-14' : 'w-80',
          !collapsed &&
            'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:w-[min(20rem,92vw)] max-md:translate-x-0 max-md:shadow-2xl',
        )}
      >
        {collapsedRail}

        <div
          className={cn(
            collapsed ? 'hidden' : 'flex h-full w-80 min-w-0 flex-col overflow-hidden',
          )}
        >
      <div className="border-b p-4 min-w-0 overflow-hidden">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">
            {t('app.name')}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onToggleCollapsed}
            title={t('sidebar.collapse')}
            aria-label={t('sidebar.collapse')}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button className="w-full" onClick={openNewStoryFlow}>
            <IconPlus className="h-4 w-4" />
            {t('sidebar.newStory')}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setShowNewFolder(true)}>
            <IconPlus className="h-4 w-4" />
            <Library className="h-4 w-4" />
            {t('sidebar.collection')}
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <UiLanguageSwitcher />
          </div>
          <NightModeToggle size="compact" />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start gap-2 text-[var(--color-muted-foreground)]"
          onClick={() => setShowFeedback(true)}
        >
          <MessageSquare className="h-4 w-4" />
          {t('feedback.button')}
        </Button>
        <BlindKidModeToggle variant="menu" />

        <div className="mt-3 border-t pt-3">
          {isAuthenticated ? (
            <Button variant="outline" className="w-full" onClick={() => void signOut()}>
              <IconLogOut className="h-4 w-4" />
              {t('auth.signOut')}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setAuthDialogMode('signIn')
                setShowAuthDialog(true)
              }}
            >
              <IconUser className="h-4 w-4" />
              {t('auth.signIn')}
            </Button>
          )}
        </div>

        {showNewFolder && (
          <div className="mt-3 flex gap-2">
            <Input
              autoFocus
              placeholder={t('sidebar.collectionName')}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreateFolder()
                if (e.key === 'Escape') setShowNewFolder(false)
              }}
            />
            <Button size="sm" onClick={() => void handleCreateFolder()}>
              {t('sidebar.add')}
            </Button>
          </div>
        )}

        <div className="relative mt-3">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <Input
            className="pl-9"
            placeholder={t('sidebar.searchPlaceholder')}
            aria-label={t('sidebar.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="mt-2 flex w-full min-w-0 items-center gap-1.5 rounded-md px-1 py-1.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-sidebar-accent)] hover:text-[var(--color-foreground)]"
          onClick={() => setFiltersExpanded((prev) => !prev)}
          aria-expanded={filtersExpanded}
        >
          {filtersExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{t('sidebar.filters')}</span>
          {activeFilterCount > 0 ? (
            <span className="shrink-0 rounded-full bg-[var(--color-primary)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        {filtersExpanded ? (
          <div className="mt-2 space-y-2">
            <div>
              <Label className="mb-1 block text-xs text-[var(--color-muted-foreground)]">
                {t('sidebar.filterLanguage')}
              </Label>
              <LanguageFilterSelect
                value={languageFilter}
                onValueChange={(v) => setLanguageFilter(v as typeof languageFilter)}
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs text-[var(--color-muted-foreground)]">
                {t('sidebar.filterGenre')}
              </Label>
              <Select value={genreFilter} onValueChange={setGenreFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t('sidebar.allGenres')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('sidebar.allGenres')}</SelectItem>
                  {availableGenres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-xs text-[var(--color-muted-foreground)]">
                {t('sidebar.showCollection')}
              </Label>
              <Select
                value={folderFilter}
                onValueChange={(value) => setFolderFilter(value as typeof folderFilter)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('sidebar.allCollections')}</SelectItem>
                  <SelectItem value="uncategorized">{t('sidebar.uncategorized')}</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </div>

      <ScrollArea className="min-w-0 flex-1">
        <div className="min-w-0 w-full p-2">
          {storyGroups.length > 0 ? (
            <SidebarStoryDnD
              groups={storyGroups.map((group) => ({
                ...group,
                header: (
                  <div
                    className={cn(
                      group.folder?.id === highlightFolderId &&
                        'rounded-lg bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/30',
                    )}
                  >
                    {group.header}
                  </div>
                ),
              }))}
              draggable={canDrag}
              getStoryProps={storyItemProps}
              onMoveStoryToPosition={(storyId, folderId, index) =>
                void moveStoryToPosition(storyId, folderId, index)
              }
              onExpandGroup={expandGroup}
            />
          ) : (
            <p className="px-3 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
              {t('sidebar.noStoriesFilter')}
            </p>
          )}
        </div>
      </ScrollArea>
        </div>
    </aside>
    {guestPrompt}
    {authDialog}
    {newStoryDialog}
    {feedbackDialog}
    </>
  )
}

function CollectionHeader({
  folder,
  storyCount,
  isCollapsed,
  collapsible,
  isEditing,
  onToggleCollapse,
  onStartEdit,
  onFinishEdit,
  onRename,
  onDelete,
  uncategorizedLabel,
}: {
  folder: Folder | null
  storyCount: number
  isCollapsed: boolean
  collapsible: boolean
  isEditing: boolean
  onToggleCollapse: () => void
  onStartEdit: () => void
  onFinishEdit: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  uncategorizedLabel: string
}) {
  const t = useUiT()
  const [name, setName] = useState(folder?.name ?? uncategorizedLabel)

  useEffect(() => {
    setName(folder?.name ?? uncategorizedLabel)
  }, [folder?.name, uncategorizedLabel])

  if (!folder) {
    return (
      <div className="group flex min-w-0 items-center gap-1 overflow-hidden px-1 py-1">
        {collapsible && (
          <button
            type="button"
            className="shrink-0 rounded p-1 hover:bg-[var(--color-sidebar-accent)]"
            onClick={onToggleCollapse}
            aria-label={
              isCollapsed ? t('sidebar.expandUncategorized') : t('sidebar.collapseUncategorized')
            }
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            )}
          </button>
        )}
        <BookOpen
          className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
          aria-hidden
        />
        <button
          type="button"
          className="min-w-0 flex-1 truncate px-1 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          onClick={collapsible ? onToggleCollapse : undefined}
        >
          {uncategorizedLabel}
        </button>
        <span className="shrink-0 px-1 text-[10px] text-[var(--color-muted-foreground)]">
          {storyCount}
        </span>
      </div>
    )
  }

  const commitRename = () => {
    const next = name.trim() || t('sidebar.collection')
    onRename(folder.id, next)
    setName(next)
    onFinishEdit()
  }

  return (
    <div className="group flex min-w-0 items-center gap-1 overflow-hidden px-1 py-1">
      {collapsible && (
        <button
          type="button"
          className="shrink-0 rounded p-1 hover:bg-[var(--color-sidebar-accent)]"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? t('sidebar.expandCollection') : t('sidebar.collapseCollection')}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          )}
        </button>
      )}

      <Library
        className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]"
        aria-hidden
      />

      {isEditing ? (
        <Input
          autoFocus
          className="h-7 flex-1 text-xs font-semibold"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') {
              setName(folder.name)
              onFinishEdit()
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <button
          type="button"
          className="min-w-0 flex-1 truncate px-1 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          onClick={collapsible ? onToggleCollapse : undefined}
          title={folder.name}
        >
          {folder.name}
        </button>
      )}

      <span className="shrink-0 px-1 text-[10px] text-[var(--color-muted-foreground)]">
        {storyCount}
      </span>

      {!isEditing && (
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={t('sidebar.renameCollection')}
            onClick={(e) => {
              e.stopPropagation()
              onStartEdit()
            }}
          >
            <IconPencil className="h-3.5 w-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title={t('sidebar.deleteCollection')}
                onClick={(e) => e.stopPropagation()}
              >
                <IconTrash className="h-3.5 w-3.5 text-[var(--color-destructive)]" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('sidebar.deleteCollectionTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('sidebar.deleteCollectionDescription', { name: folder.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex justify-end gap-2">
                <AlertDialogCancel>{t('sidebar.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: 'destructive' })}
                  onClick={() => onDelete(folder.id)}
                >
                  {t('sidebar.delete')}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}
