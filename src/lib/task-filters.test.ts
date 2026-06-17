import { describe, expect, it } from 'vitest'
import { addDays, startOfDay } from 'date-fns'
import { filterMyTasks, isTaskDueToday, isTaskOverdue, isTaskUpcoming } from '@/lib/task-filters'
import { makeProject, makeTask } from '@/test/db-helpers'

describe('task-filters', () => {
  const today = startOfDay(new Date()).getTime()
  const yesterday = addDays(startOfDay(new Date()), -1).getTime()
  const inThreeDays = addDays(startOfDay(new Date()), 3).getTime()
  const inTenDays = addDays(startOfDay(new Date()), 10).getTime()

  it('detects overdue, today, and upcoming tasks', () => {
    expect(isTaskOverdue(makeTask({ dueDate: yesterday }))).toBe(true)
    expect(isTaskDueToday(makeTask({ dueDate: today }))).toBe(true)
    expect(isTaskUpcoming(makeTask({ dueDate: inThreeDays }))).toBe(true)
    expect(isTaskUpcoming(makeTask({ dueDate: inTenDays }))).toBe(false)
  })

  it('excludes tasks from archived projects', () => {
    const activeProjectId = 'active'
    const archivedProjectId = 'archived'
    const tasks = [
      makeTask({ id: 't1', projectId: activeProjectId, title: 'Active' }),
      makeTask({ id: 't2', projectId: archivedProjectId, title: 'Archived project task' }),
    ]
    const filtered = filterMyTasks(tasks, new Set([activeProjectId]), {
      smartList: 'all',
      projectId: null,
      priority: 'any',
      assigneeId: null,
    })
    expect(filtered.map((task) => task.id)).toEqual(['t1'])
  })

  it('filters by smart list and priority', () => {
    const projectId = makeProject().id
    const activeIds = new Set([projectId])
    const tasks = [
      makeTask({ id: 'today', projectId, dueDate: today, priority: 'high' }),
      makeTask({ id: 'later', projectId, dueDate: inTenDays, priority: 'low' }),
    ]
    expect(
      filterMyTasks(tasks, activeIds, { smartList: 'today', projectId: null, priority: 'any', assigneeId: null }).map((t) => t.id),
    ).toEqual(['today'])
    expect(
      filterMyTasks(tasks, activeIds, { smartList: 'all', projectId: null, priority: 'high', assigneeId: null }).map((t) => t.id),
    ).toEqual(['today'])
  })
})
