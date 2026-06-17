import { describe, expect, it } from 'vitest'
import {
  completionUpdatesForSectionMove,
  parseSectionWorkflowKind,
  sectionIdForCompletionToggle,
  sectionWorkflowKindToStatus,
} from '@/lib/section-workflow'
import { makeTask } from '@/test/db-helpers'
import type { Section } from '@/models/types'

describe('parseSectionWorkflowKind', () => {
  it('recognizes kanban column names', () => {
    expect(parseSectionWorkflowKind('To Do')).toBe('todo')
    expect(parseSectionWorkflowKind('In Progress')).toBe('in_progress')
    expect(parseSectionWorkflowKind('Done')).toBe('done')
    expect(parseSectionWorkflowKind('Blocked')).toBe('blocked')
    expect(parseSectionWorkflowKind('Shipped')).toBe('done')
    expect(parseSectionWorkflowKind('Backlog')).toBe('todo')
  })

  it('returns null for sprint/phase buckets', () => {
    expect(parseSectionWorkflowKind('Sprint 0')).toBeNull()
    expect(parseSectionWorkflowKind('Sprint 5')).toBeNull()
    expect(parseSectionWorkflowKind('Release')).toBeNull()
  })

  it('maps kind to workflow status', () => {
    expect(sectionWorkflowKindToStatus('in_progress')).toBe('in_progress')
  })
})

describe('completionUpdatesForSectionMove', () => {
  it('marks complete when moved to Done or Shipped', () => {
    const task = makeTask({ completed: false })
    expect(completionUpdatesForSectionMove(task, 'To Do', 'Done', 100)).toEqual({
      completed: true,
      completedAt: 100,
    })
    expect(completionUpdatesForSectionMove(task, 'Sprint 1', 'Shipped', 100)).toEqual({
      completed: true,
      completedAt: 100,
    })
  })

  it('clears completion when moved out of a done column', () => {
    const task = makeTask({ completed: true, completedAt: 50 })
    expect(completionUpdatesForSectionMove(task, 'Done', 'In Progress', 100)).toEqual({
      completed: false,
      completedAt: null,
    })
  })

  it('does not change completion for sprint-to-sprint moves', () => {
    const task = makeTask({ completed: false })
    expect(completionUpdatesForSectionMove(task, 'Sprint 0', 'Sprint 1')).toBeNull()
  })
})

describe('sectionIdForCompletionToggle', () => {
  const sections: Section[] = [
    { id: 'todo', projectId: 'p', name: 'To Do', sortOrder: 0, updatedAt: 0 },
    { id: 'done', projectId: 'p', name: 'Done', sortOrder: 2, updatedAt: 0 },
  ]

  it('targets Done when completing and To Do when reopening', () => {
    const open = makeTask({ sectionId: 'todo', completed: false })
    expect(sectionIdForCompletionToggle(open, sections, true)).toBe('done')

    const closed = makeTask({ sectionId: 'done', completed: true })
    expect(sectionIdForCompletionToggle(closed, sections, false)).toBe('todo')
  })
})
