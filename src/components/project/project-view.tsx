import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router-dom'
import { useActiveDeveloper } from '@/context/active-developer-context'
import { db } from '@/db/schema'
import { BoardView } from './board-view'
import { ListView } from './list-view'
import { ProjectHeader } from './project-header'
import { useProjectViewMode } from '@/hooks/use-project-view-mode'

export function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>()
  const { loading: devLoading, needsBootstrap, activeDeveloper } = useActiveDeveloper()
  const project = useLiveQuery(() => (projectId ? db.projects.get(projectId) : undefined), [projectId])
  const [viewMode, setViewMode] = useProjectViewMode(projectId ?? '')
  const [showCompleted, setShowCompleted] = useState(false)

  if (!projectId) return null

  if (project === undefined || devLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (!project) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Project not found</div>
  }

  if (needsBootstrap) {
    return <div className="h-full" aria-hidden />
  }

  if (!activeDeveloper) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader
        project={project}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showCompleted={showCompleted}
        onShowCompletedChange={setShowCompleted}
      />
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <ListView projectId={projectId} showCompleted={showCompleted} />
        ) : (
          <BoardView projectId={projectId} showCompleted={showCompleted} />
        )}
      </div>
    </div>
  )
}
