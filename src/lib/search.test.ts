import { describe, expect, it } from 'vitest'
import { searchEntities } from '@/lib/search'
import { makeProject, makeTask } from '@/test/db-helpers'

describe('searchEntities', () => {
  it('finds projects and tasks by query', () => {
    const projects = [
      makeProject({ id: 'p1', name: 'Marketing Launch' }),
      makeProject({ id: 'p2', name: 'Home Reno', archived: true }),
    ]
    const tasks = [
      makeTask({ id: 't1', projectId: 'p1', title: 'Write brief', description: 'Q2 goals' }),
      makeTask({ id: 't2', projectId: 'p2', title: 'Hidden archived task' }),
    ]
    const results = searchEntities('brief', projects, tasks)
    expect(results.some((result) => result.type === 'task' && result.id === 't1')).toBe(true)
    expect(results.some((result) => result.id === 't2')).toBe(false)
  })

  it('matches project names', () => {
    const projects = [makeProject({ id: 'p1', name: 'Alpha Roadmap' })]
    const results = searchEntities('roadmap', projects, [])
    expect(results).toEqual([{ type: 'project', id: 'p1', title: 'Alpha Roadmap' }])
  })
})
