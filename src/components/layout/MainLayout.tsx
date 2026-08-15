import { useCallback, useState } from 'react'
import { HowToGuideDialog } from '@/components/layout/HowToGuideDialog'
import { Sidebar } from '@/components/layout/Sidebar'
import { StoryWorkspace } from '@/components/layout/StoryWorkspace'
import { StoryCreationProvider } from '@/context/storyCreation'
import { useUiT } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { readSidebarCollapsed, writeSidebarCollapsed } from '@/lib/sidebarLayout'

export function MainLayout() {
  const t = useUiT()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)
  const [showHowToGuide, setShowHowToGuide] = useState(false)

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      writeSidebarCollapsed(next)
      return next
    })
  }, [])

  return (
    <StoryCreationProvider>
      <div className="flex h-full min-h-0 overflow-hidden">
        <button
          type="button"
          className={cn(
            'fixed inset-0 z-30 bg-black/40 md:hidden',
            'transition-opacity duration-300 ease-out motion-reduce:transition-none',
            sidebarCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100',
          )}
          aria-label={t('sidebar.collapse')}
          aria-hidden={sidebarCollapsed}
          tabIndex={sidebarCollapsed ? -1 : 0}
          onClick={toggleSidebar}
        />
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
          onOpenHowToGuide={() => setShowHowToGuide(true)}
        />
        <main
          className={cn(
            'flex min-w-0 flex-1 flex-col bg-[var(--color-background)]',
            'transition-[margin,padding] duration-300 ease-out motion-reduce:transition-none',
          )}
          aria-label={t('workspace.studioAria')}
        >
          <StoryWorkspace />
        </main>
      </div>
      <HowToGuideDialog open={showHowToGuide} onOpenChange={setShowHowToGuide} />
    </StoryCreationProvider>
  )
}
