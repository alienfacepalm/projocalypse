import { addDays, isToday, startOfDay } from 'date-fns'
import type { Priority, Task } from '@/models/types'

export type SmartList = 'all' | 'today' | 'upcoming' | 'overdue'

export function isTaskOverdue(task: Task): boolean {
  if (task.completed || task.dueDate === null) return false
  const due = startOfDay(new Date(task.dueDate))
  const today = startOfDay(new Date())
  return due < today
}

export function isTaskDueToday(task: Task): boolean {
  if (task.completed || task.dueDate === null) return false
  return isToday(new Date(task.dueDate))
}

export function isTaskUpcoming(task: Task): boolean {
  if (task.completed || task.dueDate === null) return false
  const due = startOfDay(new Date(task.dueDate))
  const today = startOfDay(new Date())
  const weekOut = addDays(today, 7)
  return due > today && due <= weekOut
}

export interface MyTasksFilters {
  smartList: SmartList
  projectId: string | null
  priority: Priority | 'any'
  assigneeId: string | null | 'unassigned'
}

export function sortMyTasks(a: Task, b: Task): number {
  if (a.dueDate === null && b.dueDate === null) return a.createdAt - b.createdAt
  if (a.dueDate === null) return 1
  if (b.dueDate === null) return -1
  return a.dueDate - b.dueDate
}

export function filterMyTasks(
  tasks: Task[],
  activeProjectIds: Set<string>,
  filters: MyTasksFilters,
): Task[] {
  let result = tasks.filter((task) => !task.completed && activeProjectIds.has(task.projectId))

  if (filters.projectId) {
    result = result.filter((task) => task.projectId === filters.projectId)
  }
  if (filters.priority !== 'any') {
    result = result.filter((task) => task.priority === filters.priority)
  }
  if (filters.assigneeId === 'unassigned') {
    result = result.filter((task) => task.assigneeId === null)
  } else if (filters.assigneeId) {
    result = result.filter((task) => task.assigneeId === filters.assigneeId)
  }

  switch (filters.smartList) {
    case 'today':
      result = result.filter(isTaskDueToday)
      break
    case 'overdue':
      result = result.filter(isTaskOverdue)
      break
    case 'upcoming':
      result = result.filter(isTaskUpcoming)
      break
    default:
      break
  }

  return [...result].sort(sortMyTasks)
}

export function groupMyTasksByDue(tasks: Task[]): { withDue: Task[]; noDue: Task[] } {
  const sorted = [...tasks].sort(sortMyTasks)
  const withDue: Task[] = []
  const noDue: Task[] = []
  for (const task of sorted) {
    if (task.dueDate !== null) withDue.push(task)
    else noDue.push(task)
  }
  return { withDue, noDue }
}
