import { describe, expect, it } from 'vitest'
import {
  BOARD_LANES,
  groupTasksByLane,
  inferSectionLane,
  pickCanonicalSection,
  resolveTaskLane,
} from '@/lib/board-lanes'
import { makeTask } from '@/test/db-helpers'
import type { Section } from '@/models/types'

function makeSection(overrides: Partial<Section> & Pick<Section, 'id' | 'name' | 'sortOrder'>): Section {
  return {
    projectId: 'proj-1',
    updatedAt: 0,
    ...overrides,
  }
}

describe('inferSectionLane', () => {
  it('classifies shipped and done sections', () => {
    expect(inferSectionLane('SHIPPED')).toBe('done')
    expect(inferSectionLane('Done')).toBe('done')
    expect(inferSectionLane('Completed work')).toBe('done')
  })

  it('classifies in-progress sections', () => {
    expect(inferSectionLane('In Progress')).toBe('in_progress')
    expect(inferSectionLane('WIP')).toBe('in_progress')
    expect(inferSectionLane('Active sprint')).toBe('in_progress')
  })

  it('treats sprint and backlog names as todo', () => {
    expect(inferSectionLane('SPRINT 0')).toBe('todo')
    expect(inferSectionLane('SPRINT 4')).toBe('todo')
    expect(inferSectionLane('Backlog')).toBe('todo')
  })
})

describe('resolveTaskLane', () => {
  const shipped = makeSection({ id: 'sec-shipped', name: 'SHIPPED', sortOrder: 5 })

  it('puts completed tasks in done regardless of section', () => {
    const task = makeTask({ completed: true, sectionId: 'sec-shipped' })
    expect(resolveTaskLane(task, shipped)).toBe('done')
  })

  it('uses section lane for open tasks', () => {
    const sprint = makeSection({ id: 'sec-sprint', name: 'SPRINT 2', sortOrder: 2 })
    const task = makeTask({ completed: false, sectionId: 'sec-sprint' })
    expect(resolveTaskLane(task, sprint)).toBe('todo')
  })
})

describe('pickCanonicalSection', () => {
  it('prefers named canonical sections within a lane', () => {
    const sections = [
      makeSection({ id: 's0', name: 'SPRINT 0', sortOrder: 0 }),
      makeSection({ id: 's1', name: 'To Do', sortOrder: 1 }),
      makeSection({ id: 's2', name: 'In Progress', sortOrder: 2 }),
      makeSection({ id: 's3', name: 'SHIPPED', sortOrder: 3 }),
    ]
    expect(pickCanonicalSection(sections, 'todo')?.id).toBe('s1')
    expect(pickCanonicalSection(sections, 'in_progress')?.id).toBe('s2')
    expect(pickCanonicalSection(sections, 'done')?.id).toBe('s3')
  })
})

describe('groupTasksByLane', () => {
  it('groups and sorts tasks by workflow lane', () => {
    const sections = new Map([
      ['todo-sec', makeSection({ id: 'todo-sec', name: 'To Do', sortOrder: 0 })],
      ['wip-sec', makeSection({ id: 'wip-sec', name: 'In Progress', sortOrder: 1 })],
      ['done-sec', makeSection({ id: 'done-sec', name: 'Done', sortOrder: 2 })],
    ])
    const tasks = [
      makeTask({ id: 't1', sectionId: 'todo-sec', sortOrder: 0, completed: false }),
      makeTask({ id: 't2', sectionId: 'wip-sec', sortOrder: 0, completed: false }),
      makeTask({ id: 't3', sectionId: 'todo-sec', sortOrder: 1, completed: true }),
    ]
    const grouped = groupTasksByLane(tasks, sections)
    expect(grouped.get('todo')!.map((t) => t.id)).toEqual(['t1'])
    expect(grouped.get('in_progress')!.map((t) => t.id)).toEqual(['t2'])
    expect(grouped.get('done')!.map((t) => t.id)).toEqual(['t3'])
  })

  it('exposes three lanes in display order', () => {
    expect(BOARD_LANES.map((lane) => lane.id)).toEqual(['todo', 'in_progress', 'done'])
  })
})
