import { useCallback, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { StoryWorkspace } from '@/components/layout/StoryWorkspace'
import { readSidebarCollapsed, writeSidebarCollapsed } from '@/lib/sidebarLayout'

export function MainLayout() {
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
      <div className="flex h-screen overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} />
        <main className="flex min-w-0 flex-1 flex-col bg-[var(--color-background)]">
          <StoryWorkspace onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
        </main>
      </div>
    </>
  )
}
