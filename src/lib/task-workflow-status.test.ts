import { describe, expect, it } from 'vitest'
import { getTaskWorkflowStatus, countTasksByWorkflowStatus } from '@/lib/task-workflow-status'
import { makeTask } from '@/test/db-helpers'

describe('getTaskWorkflowStatus', () => {
  it('parses Board status from Talemail descriptions', () => {
    expect(
      getTaskWorkflowStatus(
        makeTask({ description: 'Foo\n\nBoard status: In progress\n\nTags: track-a', completed: false }),
      ),
    ).toBe('in_progress')
    expect(
      getTaskWorkflowStatus(makeTask({ description: 'Board status: Complete', completed: true })),
    ).toBe('done')
    expect(getTaskWorkflowStatus(makeTask({ description: 'Board status: Blocked', completed: false }))).toBe(
      'blocked',
    )
  })

  it('falls back to completed flag and section workflow names', () => {
    expect(getTaskWorkflowStatus(makeTask({ completed: true }))).toBe('done')
    expect(getTaskWorkflowStatus(makeTask({ completed: false }), 'Blocked')).toBe('blocked')
    expect(getTaskWorkflowStatus(makeTask({ completed: false }), 'In Progress')).toBe('in_progress')
    expect(getTaskWorkflowStatus(makeTask({ completed: false }), 'Done')).toBe('done')
    expect(getTaskWorkflowStatus(makeTask({ completed: false }), 'Shipped')).toBe('done')
    expect(getTaskWorkflowStatus(makeTask({ completed: false }), 'Sprint 1')).toBe('todo')
  })
})

describe('countTasksByWorkflowStatus', () => {
  it('counts tasks by parsed status', () => {
    const sectionNameById = new Map([['sec-blocked', 'Blocked']])
    const tasks = [
      makeTask({ id: '1', sectionId: 'sec-a', description: 'Board status: Complete', completed: true }),
      makeTask({ id: '2', sectionId: 'sec-a', description: 'Board status: In progress', completed: false }),
      makeTask({ id: '3', sectionId: 'sec-blocked', completed: false }),
    ]
    expect(countTasksByWorkflowStatus(tasks, sectionNameById)).toMatchObject({
      all: 3,
      done: 1,
      in_progress: 1,
      blocked: 1,
      todo: 0,
    })
  })
})
