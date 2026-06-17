import { describe, expect, it } from 'vitest'
import { computeProjectReorderUpdates } from '@/lib/project-drag'
import { makeProject } from '@/test/db-helpers'

describe('computeProjectReorderUpdates', () => {
  it('reorders projects', () => {
    const projects = [
      makeProject({ id: 'a', sortOrder: 0, name: 'A' }),
      makeProject({ id: 'b', sortOrder: 1, name: 'B' }),
    ]
    const updates = computeProjectReorderUpdates(projects, 'b', 'a')
    expect(updates).toEqual([
      { id: 'b', sortOrder: 0 },
      { id: 'a', sortOrder: 1 },
    ])
  })
})
