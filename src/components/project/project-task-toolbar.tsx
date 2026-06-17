import type { Priority, Task } from '@/models/types'
import {
  countTasksByWorkflowStatus,
  statusFilterChipClass,
  TASK_WORKFLOW_STATUS_LABELS,
} from '@/lib/task-workflow-status'
import type { ProjectTaskSort, ProjectStatusFilter } from '@/lib/project-task-view'
import { cn } from '@/lib/utils'

const STATUS_FILTERS: { id: ProjectStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: TASK_WORKFLOW_STATUS_LABELS.in_progress },
  { id: 'todo', label: TASK_WORKFLOW_STATUS_LABELS.todo },
  { id: 'blocked', label: TASK_WORKFLOW_STATUS_LABELS.blocked },
  { id: 'done', label: TASK_WORKFLOW_STATUS_LABELS.done },
]

const PRIORITY_FILTERS: { id: Priority | 'any'; label: string }[] = [
  { id: 'any', label: 'Any priority' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
]

const SORT_OPTIONS: { id: ProjectTaskSort; label: string }[] = [
  { id: 'board', label: 'Board order' },
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'title', label: 'Title A–Z' },
  { id: 'updated', label: 'Recently updated' },
]

interface ProjectTaskToolbarProps {
  tasks: Task[]
  sectionNameById: Map<string, string>
  statusFilter: ProjectStatusFilter
  priorityFilter: Priority | 'any'
  sort: ProjectTaskSort
  showCompleted: boolean
  onStatusFilterChange: (value: ProjectStatusFilter) => void
  onPriorityFilterChange: (value: Priority | 'any') => void
  onSortChange: (value: ProjectTaskSort) => void
  onShowCompletedChange: (value: boolean) => void
}

export function ProjectTaskToolbar({
  tasks,
  sectionNameById,
  statusFilter,
  priorityFilter,
  sort,
  showCompleted,
  onStatusFilterChange,
  onPriorityFilterChange,
  onSortChange,
  onShowCompletedChange,
}: ProjectTaskToolbarProps) {
  const counts = countTasksByWorkflowStatus(tasks, sectionNameById)

  return (
    <div className="shrink-0 border-b border-border/70 bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Status
        </span>
        {STATUS_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onStatusFilterChange(id)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              statusFilterChipClass(id === 'all' ? 'all' : id, statusFilter === id),
            )}
          >
            {label}
            <span className="ml-1 opacity-70">{counts[id]}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-[0.14em]">Priority</span>
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value as Priority | 'any')}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {PRIORITY_FILTERS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-[0.14em]">Sort</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as ProjectTaskSort)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {SORT_OPTIONS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => onShowCompletedChange(e.target.checked)}
            className="rounded border-input accent-primary"
          />
          Show completed
        </label>
      </div>
    </div>
  )
}
