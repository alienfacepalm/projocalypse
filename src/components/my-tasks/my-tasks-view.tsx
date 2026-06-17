import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Filter, FolderKanban, ListChecks } from 'lucide-react'
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
import { DeveloperBadge } from '@/components/developer/developer-badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { TaskTooltip } from '@/components/task/task-tooltip'

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
  developerMap,
}: {
  task: Task
  projectMap: Map<string, { name: string; color: string }>
  developerMap: Map<string, { name: string; color: string; initials: string | null }>
}) {
  const { openTask } = useTaskPanel()
  const project = projectMap.get(task.projectId)
  const assignee = task.assigneeId ? developerMap.get(task.assigneeId) : undefined

  return (
    <TaskTooltip
      task={task}
      meta={{ projectName: project?.name, assigneeName: assignee?.name }}
    >
      <div className="flex w-full items-center gap-3 border-b border-border px-4 py-2 hover:bg-accent/50">
        <Checkbox checked={false} onCheckedChange={() => toggleTaskComplete(task)} />
        <button type="button" className="min-w-0 flex-1 truncate text-left text-sm" onClick={() => openTask(task.id)}>
          {task.title}
        </button>
        {task.priority !== 'none' && (
          <span className={cn('h-2 w-2 shrink-0 rounded-full', priorityColor(task.priority))} />
        )}
        {assignee && <DeveloperBadge developer={assignee} />}
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
            <FolderKanban className="h-3 w-3" />
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
            {project.name}
          </Link>
        )}
      </div>
    </TaskTooltip>
  )
}

export function MyTasksView() {
  const tasks = useLiveQuery(() => db.tasks.toArray())
  const projects = useLiveQuery(() => db.projects.toArray())
  const developers = useLiveQuery(() => db.developers.orderBy('sortOrder').toArray())
  const [filters, setFilters] = useState<MyTasksFilters>({
    smartList: 'all',
    projectId: null,
    priority: 'any',
    assigneeId: null,
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

  const developerMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string; initials: string | null }>()
    for (const developer of developers ?? []) {
      map.set(developer.id, {
        name: developer.name,
        color: developer.color,
        initials: developer.initials,
      })
    }
    return map
  }, [developers])

  const filtered = useMemo(
    () => filterMyTasks(tasks ?? [], activeProjectIds, filters),
    [tasks, activeProjectIds, filters],
  )

  const grouped = useMemo(() => groupMyTasksByDue(filtered), [filtered])

  return (
    <div className="flex h-full flex-col">
      <header className="border-b-2 border-primary bg-background/90 px-4 py-3 shadow-hud-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-bold uppercase tracking-widest text-primary">My Tasks</h2>
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
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

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-accent2" aria-hidden />
          <select
            value={filters.projectId ?? ''}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                projectId: event.target.value || null,
              }))
            }
            className="h-8 border border-input bg-background px-2 font-mono text-xs"
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
            className="h-8 border border-input bg-background px-2 font-mono text-xs"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.assigneeId ?? ''}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                assigneeId: event.target.value === 'unassigned'
                  ? 'unassigned'
                  : event.target.value || null,
              }))
            }
            className="h-8 border border-input bg-background px-2 font-mono text-xs"
          >
            <option value="">Any assignee</option>
            <option value="unassigned">Unassigned</option>
            {(developers ?? []).map((developer) => (
              <option key={developer.id} value={developer.id}>
                {developer.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="hud-scrollbar flex-1 overflow-y-auto">
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
                <h3 className="border-b border-primary/40 bg-muted/50 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-accent2">
                  With due date
                </h3>
                {grouped.withDue.map((task) => (
                  <TaskItem key={task.id} task={task} projectMap={projectMap} developerMap={developerMap} />
                ))}
              </section>
            )}
            {grouped.noDue.length > 0 && (
              <section>
                <h3 className="border-b border-primary/40 bg-muted/50 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-accent2">
                  No due date
                </h3>
                {grouped.noDue.map((task) => (
                  <TaskItem key={task.id} task={task} projectMap={projectMap} developerMap={developerMap} />
                ))}
              </section>
            )}
          </>
        ) : (
          filtered.map((task) => (
            <TaskItem key={task.id} task={task} projectMap={projectMap} developerMap={developerMap} />
          ))
        )}
      </div>
    </div>
  )
}
