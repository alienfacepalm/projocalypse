import { describe, expect, it } from 'vitest'
import {
  columnDroppableId,
  computeTaskReorderUpdates,
  isColumnDroppableId,
  sectionIdFromColumnDroppableId,
} from '@/lib/task-drag'
import { makeTask } from '@/test/db-helpers'

describe('column droppable ids', () => {
  it('builds and parses column ids', () => {
    expect(columnDroppableId('sec-a')).toBe('column:sec-a')
    expect(isColumnDroppableId('column:sec-a')).toBe(true)
    expect(isColumnDroppableId('task-1')).toBe(false)
    expect(sectionIdFromColumnDroppableId('column:sec-a')).toBe('sec-a')
  })
})

describe('computeTaskReorderUpdates', () => {
  const sectionA = 'section-a'
  const sectionB = 'section-b'

  it('returns null when active task is missing', () => {
    expect(computeTaskReorderUpdates([], 'missing', 'task-2')).toBeNull()
  })

  it('returns null when dropped on self', () => {
    const tasks = [makeTask({ id: 'task-1', sectionId: sectionA, sortOrder: 0 })]
    expect(computeTaskReorderUpdates(tasks, 'task-1', 'task-1')).toBeNull()
  })

  it('moves task to end of column when dropped on empty column', () => {
    const tasks = [
      makeTask({ id: 'task-1', sectionId: sectionA, sortOrder: 0 }),
      makeTask({ id: 'task-2', sectionId: sectionB, sortOrder: 0 }),
    ]
    const updates = computeTaskReorderUpdates(tasks, 'task-1', columnDroppableId(sectionB))
    expect(updates).toEqual([
      { id: 'task-2', sectionId: sectionB, sortOrder: 0 },
      { id: 'task-1', sectionId: sectionB, sortOrder: 1 },
    ])
  })

  it('reorders within the same section', () => {
    const tasks = [
      makeTask({ id: 'task-1', sectionId: sectionA, sortOrder: 0 }),
      makeTask({ id: 'task-2', sectionId: sectionA, sortOrder: 1 }),
      makeTask({ id: 'task-3', sectionId: sectionA, sortOrder: 2 }),
    ]
    const updates = computeTaskReorderUpdates(tasks, 'task-3', 'task-1')
    expect(updates).toEqual([
      { id: 'task-3', sectionId: sectionA, sortOrder: 0 },
      { id: 'task-1', sectionId: sectionA, sortOrder: 1 },
      { id: 'task-2', sectionId: sectionA, sortOrder: 2 },
    ])
  })

  it('moves task onto another task in a different section', () => {
    const tasks = [
      makeTask({ id: 'task-1', sectionId: sectionA, sortOrder: 0 }),
      makeTask({ id: 'task-2', sectionId: sectionA, sortOrder: 1 }),
      makeTask({ id: 'task-3', sectionId: sectionB, sortOrder: 0 }),
    ]
    const updates = computeTaskReorderUpdates(tasks, 'task-1', 'task-3')
    expect(updates).toContainEqual({ id: 'task-1', sectionId: sectionB, sortOrder: 0 })
    expect(updates).toContainEqual({ id: 'task-3', sectionId: sectionB, sortOrder: 1 })
    expect(updates).toContainEqual({ id: 'task-2', sectionId: sectionA, sortOrder: 0 })
  })

  it('returns null for unknown over target', () => {
    const tasks = [makeTask({ id: 'task-1', sectionId: sectionA, sortOrder: 0 })]
    expect(computeTaskReorderUpdates(tasks, 'task-1', 'unknown')).toBeNull()
  })
})
