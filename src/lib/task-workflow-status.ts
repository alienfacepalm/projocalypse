import type { Task } from '@/models/types'
import { parseSectionWorkflowKind, sectionWorkflowKindToStatus } from '@/lib/section-workflow'
import { cn } from '@/lib/utils'

export type TaskWorkflowStatus = 'done' | 'in_progress' | 'todo' | 'blocked'

const BOARD_STATUS_RE = /Board status:\s*(Complete|In progress|To do|Blocked)/i

export const TASK_WORKFLOW_STATUS_ORDER: Record<TaskWorkflowStatus, number> = {
  blocked: 0,
  in_progress: 1,
  todo: 2,
  done: 3,
}

export const TASK_WORKFLOW_STATUS_LABELS: Record<TaskWorkflowStatus, string> = {
  done: 'Done',
  in_progress: 'In progress',
  todo: 'To do',
  blocked: 'Blocked',
}

export function getTaskWorkflowStatus(task: Task, sectionName?: string): TaskWorkflowStatus {
  const match = task.description.match(BOARD_STATUS_RE)
  if (match) {
    const label = match[1].toLowerCase()
    if (label === 'complete') return 'done'
    if (label.includes('progress')) return 'in_progress'
    if (label === 'blocked') return 'blocked'
    return 'todo'
  }
  if (task.completed) return 'done'
  const sectionKind = parseSectionWorkflowKind(sectionName)
  if (sectionKind) return sectionWorkflowKindToStatus(sectionKind)
  return 'todo'
}

export function taskWorkflowStatusClass(status: TaskWorkflowStatus): string {
  switch (status) {
    case 'done':
      return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
    case 'in_progress':
      return 'border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-100'
    case 'blocked':
      return 'border-red-500/40 bg-red-500/15 text-red-800 dark:text-red-200'
    default:
      return 'border-border bg-muted/60 text-muted-foreground'
  }
}

export function taskWorkflowRowAccentClass(status: TaskWorkflowStatus): string {
  switch (status) {
    case 'done':
      return 'border-l-emerald-500'
    case 'in_progress':
      return 'border-l-amber-500'
    case 'blocked':
      return 'border-l-red-500'
    default:
      return 'border-l-border'
  }
}

export function statusFilterChipClass(status: TaskWorkflowStatus | 'all', active: boolean): string {
  if (!active) return 'border-border bg-background text-muted-foreground hover:bg-muted'
  if (status === 'all') return 'border-foreground/30 bg-foreground/10 text-foreground'
  return cn('border-transparent', taskWorkflowStatusClass(status))
}

export function countTasksByWorkflowStatus(
  tasks: Task[],
  sectionNameById: Map<string, string>,
): Record<TaskWorkflowStatus | 'all', number> {
  const counts = { all: tasks.length, done: 0, in_progress: 0, todo: 0, blocked: 0 }
  for (const task of tasks) {
    counts[getTaskWorkflowStatus(task, sectionNameById.get(task.sectionId))] += 1
  }
  return counts
}
