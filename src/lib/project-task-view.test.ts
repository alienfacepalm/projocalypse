import { describe, expect, it } from 'vitest'
import { applyProjectTaskView } from '@/lib/project-task-view'
import { makeTask } from '@/test/db-helpers'

describe('applyProjectTaskView', () => {
  const sectionNameById = new Map([
    ['sec-1', 'Sprint 1'],
    ['sec-blocked', 'Blocked'],
  ])

  const tasks = [
    makeTask({
      id: 'a',
      sectionId: 'sec-1',
      title: 'Alpha',
      sortOrder: 0,
      priority: 'low',
      completed: true,
      description: 'Board status: Complete',
    }),
    makeTask({
      id: 'b',
      sectionId: 'sec-1',
      title: 'Beta',
      sortOrder: 1,
      priority: 'high',
      completed: false,
      description: 'Board status: In progress',
    }),
    makeTask({
      id: 'c',
      sectionId: 'sec-blocked',
      title: 'Charlie',
      sortOrder: 2,
      priority: 'medium',
      completed: false,
    }),
  ]

  it('filters by status and priority', () => {
    const filtered = applyProjectTaskView(tasks, sectionNameById, {
      showCompleted: true,
      statusFilter: 'in_progress',
      priorityFilter: 'any',
      sort: 'board',
    })
    expect(filtered.map((t) => t.id)).toEqual(['b'])
  })

  it('sorts by priority high first', () => {
    const sorted = applyProjectTaskView(tasks, sectionNameById, {
      showCompleted: true,
      statusFilter: 'all',
      priorityFilter: 'any',
      sort: 'priority',
    })
    expect(sorted.map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })
})
