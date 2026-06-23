import { describe, expect, it } from 'vitest'
import { countPlanItems, parsePlanMarkdown } from './parse-plan'

const SAMPLE = `# Sprint 12

## Backlog

- [ ] pm:PM-001 First task <!-- pm:priority=high -->
- [x] pm:PM-002 Done task <!-- pm:section=Done -->
- [ ] pm:PM-003 Task in sprint <!-- pm:section=Sprint pm:priority=medium -->
`

describe('parsePlanMarkdown', () => {
  it('extracts plan items with ids, done state, and metadata', () => {
    const items = parsePlanMarkdown(SAMPLE, 'doc/PLAN/ROADMAP.md', {
      defaultSection: 'Backlog',
      doneSection: 'Done',
    })

    expect(items).toHaveLength(3)
    expect(items[0]).toMatchObject({
      id: 'PM-001',
      title: 'First task',
      done: false,
      section: 'Backlog',
      priority: 'high',
    })
    expect(items[1]).toMatchObject({
      id: 'PM-002',
      done: true,
      section: 'Done',
    })
    expect(items[2]).toMatchObject({
      id: 'PM-003',
      section: 'Sprint',
      priority: 'medium',
    })
  })

  it('counts done and open items', () => {
    const items = parsePlanMarkdown(SAMPLE, 'plan.md')
    expect(countPlanItems(items)).toEqual({ done: 1, open: 2, total: 3 })
  })

  it('skips checkboxes without pm:ID', () => {
    const items = parsePlanMarkdown('- [ ] Regular checkbox\n', 'plan.md')
    expect(items).toHaveLength(0)
  })

  it('extracts pm:description metadata and indented body lines', () => {
    const md = `# Backlog

- [ ] pm:PM-010 Meta description <!-- pm:description=Ship when VPC is live pm:priority=high -->
- [ ] pm:PM-011 Indented body
  First detail line.
  Second detail line.
- [ ] pm:PM-012 Blockquote body
  > Quote detail line.
`
    const items = parsePlanMarkdown(md, 'plan.md')
    expect(items.find((item) => item.id === 'PM-010')?.description).toBe('Ship when VPC is live')
    expect(items.find((item) => item.id === 'PM-011')?.description).toBe(
      'First detail line.\nSecond detail line.',
    )
    expect(items.find((item) => item.id === 'PM-012')?.description).toBe('Quote detail line.')
  })
})
