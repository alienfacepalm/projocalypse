import { describe, expect, it } from 'vitest'
import { computeSectionReorderUpdates, sectionIdFromReorderOverId } from '@/lib/section-drag'
import { makeSection } from '@/test/db-helpers'

describe('computeSectionReorderUpdates', () => {
  it('reorders sections', () => {
    const sections = [
      makeSection({ id: 'a', sortOrder: 0, name: 'A' }),
      makeSection({ id: 'b', sortOrder: 1, name: 'B' }),
      makeSection({ id: 'c', sortOrder: 2, name: 'C' }),
    ]
    const updates = computeSectionReorderUpdates(sections, 'c', 'a')
    expect(updates).toEqual([
      { id: 'c', sortOrder: 0 },
      { id: 'a', sortOrder: 1 },
      { id: 'b', sortOrder: 2 },
    ])
  })
})

describe('sectionIdFromReorderOverId', () => {
  it('parses sortable and column droppable ids', () => {
    expect(sectionIdFromReorderOverId('section:abc')).toBe('abc')
    expect(sectionIdFromReorderOverId('column:xyz')).toBe('xyz')
    expect(sectionIdFromReorderOverId('task-1')).toBeNull()
  })
})
