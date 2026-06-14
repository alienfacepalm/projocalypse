import { useState, type ReactNode } from 'react'
import { Sidebar, MobileMenuButton } from './sidebar'
import { TaskDetailPanel } from '@/components/task/task-detail-panel'

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-border/60 bg-background/80 px-3 py-2 backdrop-blur-sm md:hidden">
          <MobileMenuButton onClick={() => setSidebarOpen(true)} />
        </div>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
      <TaskDetailPanel />
    </div>
  )
}
