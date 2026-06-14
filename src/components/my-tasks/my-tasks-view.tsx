import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '@/db/schema'
import { toggleTaskComplete } from '@/db/operations'
import { useTaskPanel } from '@/context/task-panel-context'
import type { Priority, Task } from '@/models/types'
import {
  filterMyTasks,
  groupMyTasksByDue,
  type MyTasksFilters,
  type SmartList,
} from '@/lib/task-filters'
import { cn, dueDateClass, formatDueDate, priorityColor } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

const SMART_LISTS: { id: SmartList; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
]

const PRIORITY_OPTIONS: { id: Priority | 'any'; label: string }[] = [
  { id: 'any', label: 'Any priority' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
  { id: 'none', label: 'None' },
]

function TaskItem({
  task,
  projectMap,
}: {
  task: Task
  projectMap: Map<string, { name: string; color: string }>
}) {
  const { openTask } = useTaskPanel()
  const project = projectMap.get(task.projectId)

  return (
    <div className="flex items-center gap-3 border-b px-4 py-2 hover:bg-muted/50">
      <Checkbox checked={false} onCheckedChange={() => toggleTaskComplete(task)} />
      <button type="button" className="flex-1 truncate text-left text-sm" onClick={() => openTask(task.id)}>
        {task.title}
      </button>
      {task.priority !== 'none' && (
        <span className={cn('h-2 w-2 shrink-0 rounded-full', priorityColor(task.priority))} />
      )}
      {task.dueDate !== null && (
        <span className={cn('shrink-0 text-xs', dueDateClass(task.dueDate, false))}>
          {formatDueDate(task.dueDate)}
        </span>
      )}
      {project && (
        <Link
          to={`/project/${task.projectId}`}
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
          {project.name}
        </Link>
      )}
    </div>
  )
}

export function MyTasksView() {
  const tasks = useLiveQuery(() => db.tasks.toArray())
  const projects = useLiveQuery(() => db.projects.toArray())
  const [filters, setFilters] = useState<MyTasksFilters>({
    smartList: 'all',
    projectId: null,
    priority: 'any',
  })

  const activeProjectIds = useMemo(
    () => new Set((projects ?? []).filter((project) => !project.archived).map((project) => project.id)),
    [projects],
  )

  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>()
    for (const project of projects ?? []) {
      map.set(project.id, { name: project.name, color: project.color })
    }
    return map
  }, [projects])

  const activeProjects = useMemo(
    () => (projects ?? []).filter((project) => !project.archived).sort((a, b) => a.sortOrder - b.sortOrder),
    [projects],
  )

  const filtered = useMemo(
    () => filterMyTasks(tasks ?? [], activeProjectIds, filters),
    [tasks, activeProjectIds, filters],
  )

  const grouped = useMemo(() => groupMyTasksByDue(filtered), [filtered])

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-sm">
        <h2 className="font-display text-lg font-semibold tracking-tight">My Tasks</h2>
        <p className="text-sm text-muted-foreground">
          {filtered.length} incomplete task{filtered.length !== 1 ? 's' : ''}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SMART_LISTS.map((item) => (
            <Button
              key={item.id}
              variant={filters.smartList === item.id ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7"
              onClick={() => setFilters((prev) => ({ ...prev, smartList: item.id }))}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <select
            value={filters.projectId ?? ''}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                projectId: event.target.value || null,
              }))
            }
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">All projects</option>
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                priority: event.target.value as Priority | 'any',
              }))
            }
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
            <p>
              {filters.smartList === 'all'
                ? "You're all caught up!"
                : `No ${filters.smartList} tasks.`}
            </p>
            <p className="text-sm">
              {filters.smartList === 'all'
                ? 'Create tasks in a project to see them here.'
                : 'Try another list or clear filters.'}
            </p>
          </div>
        ) : filters.smartList === 'all' ? (
          <>
            {grouped.withDue.length > 0 && (
              <section>
                <h3 className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  With due date
                </h3>
                {grouped.withDue.map((task) => (
                  <TaskItem key={task.id} task={task} projectMap={projectMap} />
                ))}
              </section>
            )}
            {grouped.noDue.length > 0 && (
              <section>
                <h3 className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  No due date
                </h3>
                {grouped.noDue.map((task) => (
                  <TaskItem key={task.id} task={task} projectMap={projectMap} />
                ))}
              </section>
            )}
          </>
        ) : (
          filtered.map((task) => <TaskItem key={task.id} task={task} projectMap={projectMap} />)
        )}
      </div>
    </div>
  )
}
