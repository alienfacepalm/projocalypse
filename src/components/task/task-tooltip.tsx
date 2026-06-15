import { useMemo, type ReactElement } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Task } from '@/models/types'
import { db } from '@/db/schema'
import { buildTaskTooltipDetails, type TaskTooltipMeta } from '@/lib/task-tooltip'
import { developerDisplayName } from '@/lib/developer'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface TaskTooltipContentProps {
  task: Task
  meta?: TaskTooltipMeta
}

export function TaskTooltipContent({ task, meta = {} }: TaskTooltipContentProps) {
  const subtasks = useLiveQuery(() => db.subtasks.where('taskId').equals(task.id).toArray(), [task.id])
  const assignee = useLiveQuery(
    () => (task.assigneeId ? db.developers.get(task.assigneeId) : undefined),
    [task.assigneeId],
  )

  const enrichedMeta = useMemo(() => {
    let next = meta
    if (assignee) {
      next = { ...next, assigneeName: developerDisplayName(assignee) }
    }
    if (!subtasks?.length) return next
    return {
      ...next,
      subtaskCount: subtasks.length,
      subtaskCompleted: subtasks.filter((item) => item.completed).length,
    }
  }, [meta, subtasks, assignee])

  const { title, description, details } = buildTaskTooltipDetails(task, enrichedMeta)

  return (
    <div className="space-y-2">
      <p className="font-display text-[10px] font-bold uppercase tracking-widest text-primary">Task preview</p>
      <p className={cn('font-sans text-sm leading-snug', task.completed && 'line-through text-muted-foreground')}>
        {title}
      </p>
      {description ? (
        <p className="font-sans text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wide">
        {details.map((detail) => (
          <div key={detail.label} className="contents">
            <dt className="text-accent2">{detail.label}</dt>
            <dd className="text-foreground">{detail.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

interface TaskTooltipProps {
  task: Task
  children: ReactElement
  meta?: TaskTooltipMeta
  disabled?: boolean
}

export function TaskTooltip({ task, children, meta, disabled = false }: TaskTooltipProps) {
  if (disabled) {
    return children
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="start" className="w-72">
        <TaskTooltipContent task={task} meta={meta} />
      </TooltipContent>
    </Tooltip>
  )
}
