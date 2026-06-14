import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '@/db/schema'
import { toggleTaskComplete } from '@/db/operations'
import { useTaskPanel } from '@/context/task-panel-context'
import { cn, dueDateClass, formatDueDate, priorityColor } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

export function MyTasksView() {
  const { openTask } = useTaskPanel()
  const tasks = useLiveQuery(() => db.tasks.filter((t) => !t.completed).toArray())
  const projects = useLiveQuery(() => db.projects.toArray())

  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>()
    for (const p of projects ?? []) {
      map.set(p.id, { name: p.name, color: p.color })
    }
    return map
  }, [projects])

  const grouped = useMemo(() => {
    const sorted = [...(tasks ?? [])].sort((a, b) => {
      if (a.dueDate === null && b.dueDate === null) return a.createdAt - b.createdAt
      if (a.dueDate === null) return 1
      if (b.dueDate === null) return -1
      return a.dueDate - b.dueDate
    })

    const withDue: typeof sorted = []
    const noDue: typeof sorted = []
    for (const t of sorted) {
      if (t.dueDate !== null) withDue.push(t)
      else noDue.push(t)
    }
    return { withDue, noDue }
  }, [tasks])

  function TaskItem({ task }: { task: NonNullable<typeof tasks>[number] }) {
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

  const total = (tasks ?? []).length

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-sm">
        <h2 className="font-display text-lg font-semibold tracking-tight">My Tasks</h2>
        <p className="text-sm text-muted-foreground">{total} incomplete task{total !== 1 ? 's' : ''}</p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {total === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <p>You're all caught up!</p>
            <p className="text-sm">Create tasks in a project to see them here.</p>
          </div>
        ) : (
          <>
            {grouped.withDue.length > 0 && (
              <section>
                <h3 className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  With due date
                </h3>
                {grouped.withDue.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </section>
            )}
            {grouped.noDue.length > 0 && (
              <section>
                <h3 className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  No due date
                </h3>
                {grouped.noDue.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
