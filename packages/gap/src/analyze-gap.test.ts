import { describe, expect, it } from 'vitest'
import { analyzeGap, formatGapReport } from './analyze-gap'

describe('analyzeGap', () => {
  it('detects missing-on-board and status mismatch', () => {
    const report = analyzeGap({
      packageName: '@talemail/web',
      planItems: [
        {
          id: 'PM-001',
          title: 'Open task',
          done: false,
          section: 'Sprint',
          priority: 'none',
          source: { file: 'plan.md', line: 1 },
        },
        {
          id: 'PM-002',
          title: 'Done in plan',
          done: true,
          section: 'Done',
          priority: 'none',
          source: { file: 'plan.md', line: 2 },
        },
      ],
      board: {
        version: 1,
        packageName: '@talemail/web',
        hostProjectId: 'proj-1',
        exportedAt: new Date().toISOString(),
        tasks: [
          {
            id: 't1',
            planItemId: 'PM-002',
            title: 'Done in plan',
            completed: false,
            sectionName: 'Sprint',
            priority: 'none',
          },
        ],
      },
      registryEntry: { planGlobs: ['plan.md'], sections: ['Sprint', 'Done'] },
      hasLink: true,
      hasEmbedMount: true,
      hasPmScripts: true,
    })

    expect(report.gaps.some((g) => g.code === 'MISSING_ON_BOARD' && g.planItemId === 'PM-001')).toBe(true)
    expect(report.gaps.some((g) => g.code === 'STATUS_MISMATCH' && g.planItemId === 'PM-002')).toBe(true)
    expect(formatGapReport(report)).toContain('@talemail/web')
  })
})
