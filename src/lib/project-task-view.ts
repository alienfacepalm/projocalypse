import type { Priority, Task } from '@/models/types'
import {
  getTaskWorkflowStatus,
  TASK_WORKFLOW_STATUS_ORDER,
  type TaskWorkflowStatus,
} from '@/lib/task-workflow-status'

export type ProjectTaskSort = 'board' | 'status' | 'priority' | 'title' | 'updated'

export type ProjectStatusFilter = TaskWorkflowStatus | 'all'

export interface ProjectTaskViewOptions {
  showCompleted: boolean
  statusFilter: ProjectStatusFilter
  priorityFilter: Priority | 'any'
  sort: ProjectTaskSort
}

export const DEFAULT_PROJECT_TASK_VIEW: ProjectTaskViewOptions = {
  showCompleted: false,
  statusFilter: 'all',
  priorityFilter: 'any',
  sort: 'board',
}

const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
}

export function compareProjectTasks(
  a: Task,
  b: Task,
  sort: ProjectTaskSort,
  sectionNameById: Map<string, string>,
): number {
  switch (sort) {
    case 'status': {
      const statusDiff =
        TASK_WORKFLOW_STATUS_ORDER[getTaskWorkflowStatus(a, sectionNameById.get(a.sectionId))] -
        TASK_WORKFLOW_STATUS_ORDER[getTaskWorkflowStatus(b, sectionNameById.get(b.sectionId))]
      if (statusDiff !== 0) return statusDiff
      return a.sortOrder - b.sortOrder
    }
    case 'priority': {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.sortOrder - b.sortOrder
    }
    case 'title':
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    case 'updated':
      return b.updatedAt - a.updatedAt
    default:
      return a.sortOrder - b.sortOrder
  }
}

export function applyProjectTaskView(
  tasks: Task[],
  sectionNameById: Map<string, string>,
  options: ProjectTaskViewOptions,
): Task[] {
  let result = tasks

  if (!options.showCompleted) {
    result = result.filter((task) => !task.completed)
  }
  if (options.statusFilter !== 'all') {
    result = result.filter(
      (task) => getTaskWorkflowStatus(task, sectionNameById.get(task.sectionId)) === options.statusFilter,
    )
  }
  if (options.priorityFilter !== 'any') {
    result = result.filter((task) => task.priority === options.priorityFilter)
  }

  return [...result].sort((a, b) => compareProjectTasks(a, b, options.sort, sectionNameById))
}
