import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router-dom'
import type { Priority } from '@/models/types'
import { db } from '@/db/schema'
import { isTalemailProjectName } from '@/lib/talemail-import'
import {
  DEFAULT_PROJECT_TASK_VIEW,
  type ProjectTaskSort,
  type ProjectStatusFilter,
} from '@/lib/project-task-view'
import { BoardView } from './board-view'
import { ListView } from './list-view'
import { ProjectHeader } from './project-header'
import { ProjectTaskToolbar } from './project-task-toolbar'
import { TalemailBoardEmptyState } from './talemail-board-empty-state'
import { useProjectViewMode } from '@/hooks/use-project-view-mode'

export function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>()
  const project = useLiveQuery(() => (projectId ? db.projects.get(projectId) : undefined), [projectId])
  const sections = useLiveQuery(
    () => (projectId ? db.sections.where('projectId').equals(projectId).toArray() : []),
    [projectId],
  )
  const allTasks = useLiveQuery(
    () => (projectId ? db.tasks.where('projectId').equals(projectId).toArray() : []),
    [projectId],
  )
  const [viewMode, setViewMode] = useProjectViewMode(projectId ?? '')
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>(DEFAULT_PROJECT_TASK_VIEW.statusFilter)
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'any'>(DEFAULT_PROJECT_TASK_VIEW.priorityFilter)
  const [sort, setSort] = useState<ProjectTaskSort>(DEFAULT_PROJECT_TASK_VIEW.sort)
  const [showCompleted, setShowCompleted] = useState(DEFAULT_PROJECT_TASK_VIEW.showCompleted)

  const sectionNameById = useMemo(
    () => new Map((sections ?? []).map((section) => [section.id, section.name])),
    [sections],
  )

  const taskViewOptions = useMemo(
    () => ({ showCompleted, statusFilter, priorityFilter, sort }),
    [showCompleted, statusFilter, priorityFilter, sort],
  )

  if (!projectId) return null

  if (project === undefined || allTasks === undefined) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (!project) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Project not found</div>
  }

  const showTalemailImport =
    (allTasks?.length ?? 0) === 0 && isTalemailProjectName(project.name)

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader project={project} viewMode={viewMode} onViewModeChange={setViewMode} />
      {!showTalemailImport && (
        <ProjectTaskToolbar
          tasks={allTasks ?? []}
          sectionNameById={sectionNameById}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          sort={sort}
          showCompleted={showCompleted}
          onStatusFilterChange={setStatusFilter}
          onPriorityFilterChange={setPriorityFilter}
          onSortChange={setSort}
          onShowCompletedChange={setShowCompleted}
        />
      )}
      <div className="flex-1 overflow-hidden">
        {showTalemailImport ? (
          <TalemailBoardEmptyState />
        ) : viewMode === 'list' ? (
          <ListView
            projectId={projectId}
            taskViewOptions={taskViewOptions}
            sectionNameById={sectionNameById}
          />
        ) : (
          <BoardView
            projectId={projectId}
            taskViewOptions={taskViewOptions}
            sectionNameById={sectionNameById}
          />
        )}
      </div>
    </div>
  )
}
