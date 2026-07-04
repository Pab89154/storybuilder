import { useCallback, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { StoryWorkspace } from '@/components/layout/StoryWorkspace'
import { useUiT } from '@/i18n/context'
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
        {!sidebarCollapsed ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            aria-label={t('sidebar.collapse')}
            onClick={toggleSidebar}
          />
        ) : null}
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} />
        <main className="flex min-w-0 flex-1 flex-col bg-[var(--color-background)]">
          <StoryWorkspace onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
        </main>
      </div>
    </>
  )
}
