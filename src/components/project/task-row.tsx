import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useLiveQuery } from 'dexie-react-hooks'
import { GripVertical } from 'lucide-react'
import type { Task } from '@/models/types'
import { db } from '@/db/schema'
import { toggleTaskComplete } from '@/db/operations'
import { useTaskPanel } from '@/context/task-panel-context'
import { DeveloperBadge } from '@/components/developer/developer-badge'
import { cn, dueDateClass, formatDueDate, priorityColor } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { TaskTooltip } from '@/components/task/task-tooltip'

interface TaskRowProps {
  task: Task
  draggable?: boolean
  compact?: boolean
  sectionName?: string
  projectName?: string
  showTooltip?: boolean
}

export function TaskRow({
  task,
  draggable = true,
  compact = false,
  sectionName,
  projectName,
  showTooltip = true,
}: TaskRowProps) {
  const { openTask } = useTaskPanel()
  const assignee = useLiveQuery(
    () => (task.assigneeId ? db.developers.get(task.assigneeId) : undefined),
    [task.assigneeId],
  )
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !draggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 border-b border-border/60 px-3 hover:bg-accent/50',
        compact ? 'py-2' : 'py-1.5',
        task.completed && 'opacity-60',
      )}
    >
      {draggable && (
        <button
          className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => toggleTaskComplete(task)}
        onPointerDown={(event) => event.stopPropagation()}
        className="shrink-0"
      />
      <TaskTooltip
        task={task}
        disabled={isDragging || !showTooltip}
        meta={{ sectionName, projectName, assigneeName: assignee?.name }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            className={cn('flex-1 truncate text-left font-sans text-sm', task.completed && 'line-through text-muted-foreground')}
            onClick={() => openTask(task.id)}
          >
            {task.title}
          </button>
          {task.priority !== 'none' && (
            <span className={cn('h-2 w-2 shrink-0 rounded-full', priorityColor(task.priority))} title={task.priority} />
          )}
          {assignee && <DeveloperBadge developer={assignee} />}
          {task.dueDate !== null && (
            <span className={cn('shrink-0 text-xs', dueDateClass(task.dueDate, task.completed))}>
              {formatDueDate(task.dueDate)}
            </span>
          )}
        </div>
      </TaskTooltip>
    </div>
  )
}
