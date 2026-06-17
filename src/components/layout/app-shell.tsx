import { useState, type ReactNode } from 'react'
import { Sidebar, MobileMenuButton } from './sidebar'
import { TaskDetailPanel } from '@/components/task/task-detail-panel'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useEmbed } from '@/context/embed-context'

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { hideSidebar } = useEmbed()

  if (hideSidebar) {
    return (
      <TooltipProvider delayDuration={500} skipDelayDuration={200} disableHoverableContent>
        <div className="flex h-screen overflow-hidden">
          <main className="hud-scrollbar flex-1 overflow-hidden">{children}</main>
          <TaskDetailPanel />
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delayDuration={500} skipDelayDuration={200} disableHoverableContent>
      <div className="flex h-screen overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center border-b-2 border-primary bg-background/90 px-3 py-2 shadow-hud-sm md:hidden">
            <MobileMenuButton onClick={() => setSidebarOpen(true)} />
          </div>
          <main className="hud-scrollbar flex-1 overflow-hidden">{children}</main>
        </div>
        <TaskDetailPanel />
      </div>
    </TooltipProvider>
  )
}
