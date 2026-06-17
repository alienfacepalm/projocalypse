import { describe, expect, it } from 'vitest'
import { buildPendingFromPlan, validateWorkspaceConfig } from './validate'

describe('validateWorkspaceConfig', () => {
  it('parses a valid workspace', () => {
    const config = validateWorkspaceConfig({
      version: 1,
      packages: {
        '@talemail/web': {
          planGlobs: ['packages/web/doc/PLAN/**/*.md'],
          sections: ['Backlog', 'Sprint', 'Done'],
        },
      },
    })
    expect(config.packages['@talemail/web']?.planGlobs).toHaveLength(1)
  })
})

describe('buildPendingFromPlan', () => {
  it('builds upserts from plan items', () => {
    const pending = buildPendingFromPlan(
      '@talemail/web',
      [
        {
          id: 'PM-001',
          title: 'Task one',
          done: false,
          section: 'Sprint',
          priority: 'high',
          source: { file: 'plan.md', line: 1 },
        },
      ],
      { planGlobs: [], sections: ['Backlog', 'Sprint', 'Done'] },
    )
    expect(pending.upserts).toHaveLength(1)
    expect(pending.upserts[0]?.planItemId).toBe('PM-001')
  })

  it('skips existing ids with merge-new-only', () => {
    const pending = buildPendingFromPlan(
      '@talemail/web',
      [
        {
          id: 'PM-001',
          title: 'Task one',
          done: false,
          section: null,
          priority: 'none',
          source: { file: 'plan.md', line: 1 },
        },
      ],
      { planGlobs: [] },
      { existingPlanIds: new Set(['PM-001']) },
    )
    expect(pending.upserts).toHaveLength(0)
  })
})
