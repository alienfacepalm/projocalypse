import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { removeGettingStartedProjects } from '@/db/operations'
import { db } from '@/db/schema'
import { ConfirmProvider } from '@/context/confirm-context'
import { ActiveDeveloperProvider } from '@/context/active-developer-context'
import { EmbedProvider } from '@/context/embed-context'
import { TaskPanelProvider } from '@/context/task-panel-context'
import { DeveloperBootstrapDialog } from '@/components/developer/developer-bootstrap-dialog'
import { AppShell } from '@/components/layout/app-shell'
import { ProjectView } from '@/components/project/project-view'
import { MyTasksView } from '@/components/my-tasks/my-tasks-view'
import type { EmbedConfig } from '@/lib/embed'

function HomeRedirect() {
  const projects = useLiveQuery(() => db.projects.filter((p) => !p.archived).sortBy('sortOrder'))
  if (projects === undefined) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>
  }
  if (projects.length === 0) return <Navigate to="/my-tasks" replace />
  return <Navigate to={`/project/${projects[0].id}`} replace />
}

export default function App({ embed }: { embed?: Partial<EmbedConfig> }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    removeGettingStartedProjects().then(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <EmbedProvider config={embed}>
      <BrowserRouter>
        <ConfirmProvider>
          <ActiveDeveloperProvider>
            <TaskPanelProvider>
              <AppShell>
                <Routes>
                  <Route path="/" element={<HomeRedirect />} />
                  <Route path="/my-tasks" element={<MyTasksView />} />
                  <Route path="/project/:projectId" element={<ProjectView />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
              <DeveloperBootstrapDialog />
            </TaskPanelProvider>
          </ActiveDeveloperProvider>
        </ConfirmProvider>
      </BrowserRouter>
    </EmbedProvider>
  )
}
