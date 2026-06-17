import type { Task } from '@/models/types'
import { getTaskWorkflowStatus, TASK_WORKFLOW_STATUS_LABELS, taskWorkflowStatusClass } from '@/lib/task-workflow-status'
import { cn } from '@/lib/utils'

interface TaskStatusBadgeProps {
  task: Task
  sectionName?: string
  className?: string
  size?: 'sm' | 'md'
}

export function TaskStatusBadge({ task, sectionName, className, size = 'sm' }: TaskStatusBadgeProps) {
  const status = getTaskWorkflowStatus(task, sectionName)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border font-medium uppercase tracking-wide',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        taskWorkflowStatusClass(status),
        className,
      )}
      title={`Status: ${TASK_WORKFLOW_STATUS_LABELS[status]}`}
    >
      {TASK_WORKFLOW_STATUS_LABELS[status]}
    </span>
  )
}
