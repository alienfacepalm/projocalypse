import { describe, expect, it } from 'vitest'
import {
  computeBoardTaskReorderUpdates,
  isLaneDroppableId,
  laneDroppableId,
  laneFromDroppableId,
} from '@/lib/board-task-drag'
import { makeTask } from '@/test/db-helpers'
import type { Section } from '@/models/types'

function makeSection(overrides: Partial<Section> & Pick<Section, 'id' | 'name' | 'sortOrder'>): Section {
  return {
    projectId: 'proj-1',
    updatedAt: 0,
    ...overrides,
  }
}

describe('lane droppable ids', () => {
  it('builds and parses lane ids', () => {
    expect(laneDroppableId('todo')).toBe('lane:todo')
    expect(isLaneDroppableId('lane:in_progress')).toBe(true)
    expect(laneFromDroppableId('lane:done')).toBe('done')
  })
})

describe('computeBoardTaskReorderUpdates', () => {
  const sections = [
    makeSection({ id: 'todo', name: 'To Do', sortOrder: 0 }),
    makeSection({ id: 'wip', name: 'In Progress', sortOrder: 1 }),
    makeSection({ id: 'done', name: 'Done', sortOrder: 2 }),
  ]

  it('moves task to in-progress lane and clears completion', () => {
    const tasks = [
      makeTask({ id: 'task-1', sectionId: 'todo', sortOrder: 0, completed: false }),
      makeTask({ id: 'task-2', sectionId: 'wip', sortOrder: 0, completed: false }),
    ]
    const updates = computeBoardTaskReorderUpdates(tasks, sections, 'task-1', 'task-2', 1000)
    expect(updates).toContainEqual({
      id: 'task-1',
      sectionId: 'wip',
      sortOrder: 0,
      completed: false,
      completedAt: null,
    })
  })

  it('marks task complete when dropped on shipped lane', () => {
    const tasks = [makeTask({ id: 'task-1', sectionId: 'todo', sortOrder: 0, completed: false })]
    const updates = computeBoardTaskReorderUpdates(
      tasks,
      sections,
      'task-1',
      laneDroppableId('done'),
      2000,
    )
    expect(updates).toEqual([
      {
        id: 'task-1',
        sectionId: 'done',
        sortOrder: 0,
        completed: true,
        completedAt: 2000,
      },
    ])
  })

  it('returns null when dropped on self', () => {
    const tasks = [makeTask({ id: 'task-1', sectionId: 'todo', sortOrder: 0 })]
    expect(computeBoardTaskReorderUpdates(tasks, sections, 'task-1', 'task-1')).toBeNull()
  })
})
