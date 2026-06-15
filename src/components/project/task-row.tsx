import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { Task } from '@/models/types'
import { toggleTaskComplete } from '@/db/operations'
import { useTaskPanel } from '@/context/task-panel-context'
import { TaskStatusBadge } from '@/components/task/task-status-badge'
import { getTaskWorkflowStatus, taskWorkflowRowAccentClass } from '@/lib/task-workflow-status'
import { cn, dueDateClass, formatDueDate, priorityColor } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

interface TaskRowProps {
  task: Task
  draggable?: boolean
  compact?: boolean
  sectionName?: string
  showStatus?: boolean
}

export function TaskRow({
  task,
  draggable = true,
  compact = false,
  sectionName,
  showStatus = true,
}: TaskRowProps) {
  const { openTask } = useTaskPanel()
  const status = getTaskWorkflowStatus(task, sectionName)
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
        'group flex items-center gap-2 border-b border-transparent border-l-[3px] hover:bg-muted/50',
        compact ? 'py-2 pl-2 pr-3' : 'py-1.5 pl-2 pr-3',
        taskWorkflowRowAccentClass(status),
        task.completed && status === 'done' && 'opacity-75',
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
        className="shrink-0"
      />
      {showStatus && <TaskStatusBadge task={task} sectionName={sectionName} />}
      <button
        type="button"
        className={cn('min-w-0 flex-1 truncate text-left text-sm', task.completed && 'text-muted-foreground')}
        onClick={() => openTask(task.id)}
      >
        <span className={cn(task.completed && 'line-through')}>{task.title}</span>
      </button>
      {task.priority !== 'none' && (
        <span className={cn('h-2 w-2 shrink-0 rounded-full', priorityColor(task.priority))} title={task.priority} />
      )}
      {task.dueDate !== null && (
        <span className={cn('shrink-0 text-xs', dueDateClass(task.dueDate, task.completed))}>
          {formatDueDate(task.dueDate)}
        </span>
      )}
    </div>
  )
}
