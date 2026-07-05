import { useCallback, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { StoryWorkspace } from '@/components/layout/StoryWorkspace'
import { useUiT } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { readSidebarCollapsed, writeSidebarCollapsed } from '@/lib/sidebarLayout'

export function MainLayout() {
  const t = useUiT()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      writeSidebarCollapsed(next)
      return next
    })
  }, [])

  return (
    <>
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
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} />
        <main
          className={cn(
            'flex min-w-0 flex-1 flex-col bg-[var(--color-background)]',
            'transition-[margin,padding] duration-300 ease-out motion-reduce:transition-none',
          )}
        >
          <StoryWorkspace />
        </main>
      </div>
    </>
  )
}
