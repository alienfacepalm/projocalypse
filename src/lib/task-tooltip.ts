import type { Priority, Task } from '@/models/types'
import { formatDueDate, priorityLabel } from '@/lib/utils'

export interface TaskTooltipMeta {
  projectName?: string
  sectionName?: string
  assigneeName?: string
  subtaskCount?: number
  subtaskCompleted?: number
}

export function truncateDescription(text: string, maxLength = 120): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength - 1)}…`
}

export function taskStatusLabel(completed: boolean): string {
  return completed ? 'Complete' : 'Open'
}

export function formatSubtaskSummary(total?: number, completed?: number): string | null {
  if (total == null || total === 0) return null
  const done = completed ?? 0
  return `${done}/${total} subtask${total === 1 ? '' : 's'}`
}

export interface TaskTooltipDetail {
  label: string
  value: string
}

export function buildTaskTooltipDetails(
  task: Pick<Task, 'title' | 'description' | 'completed' | 'dueDate' | 'priority'>,
  meta: TaskTooltipMeta = {},
): { title: string; description: string | null; details: TaskTooltipDetail[] } {
  const details: TaskTooltipDetail[] = [{ label: 'Status', value: taskStatusLabel(task.completed) }]

  if (task.priority !== 'none') {
    details.push({ label: 'Priority', value: priorityLabel(task.priority as Priority) })
  }

  if (task.dueDate !== null) {
    details.push({ label: 'Due', value: formatDueDate(task.dueDate) })
  }

  if (meta.sectionName) {
    details.push({ label: 'Section', value: meta.sectionName })
  }

  if (meta.assigneeName) {
    details.push({ label: 'Assignee', value: meta.assigneeName })
  }

  if (meta.projectName) {
    details.push({ label: 'Project', value: meta.projectName })
  }

  const subtaskSummary = formatSubtaskSummary(meta.subtaskCount, meta.subtaskCompleted)
  if (subtaskSummary) {
    details.push({ label: 'Subtasks', value: subtaskSummary })
  }

  return {
    title: task.title,
    description: truncateDescription(task.description) || null,
    details,
  }
}
