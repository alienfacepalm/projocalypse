import { describe, expect, it } from 'vitest'
import { PENDING_SYNC_VERSION } from '@projocalypse/core'
import { applyPendingSync, createHostProject } from '@/lib/host-bridge'
import { db } from '@/db/schema'
import { clearDb } from '@/test/db-helpers'

describe('applyPendingSync', () => {
  it('creates tasks from pending upserts with plan item ids', async () => {
    await clearDb()
    const project = await createHostProject('Host', ['Backlog', 'Sprint', 'Done'])

    const result = await applyPendingSync(project.id, {
      version: PENDING_SYNC_VERSION,
      packageName: '@test/app',
      hostProjectId: project.id,
      generatedAt: new Date().toISOString(),
      seedPolicy: 'merge-new-only',
      sections: ['Backlog', 'Sprint', 'Done'],
      upserts: [
        {
          planItemId: 'PM-001',
          title: 'First sprint task',
          completed: false,
          sectionName: 'Sprint',
          priority: 'high',
        },
      ],
    })

    expect(result.created).toBe(1)
  })

  it('removes empty columns not listed in pending sections', async () => {
    await clearDb()
    const project = await createHostProject('Host', ['Backlog', 'Sprint 0', 'S0 · Decisions', 'Done'])

    await applyPendingSync(project.id, {
      version: PENDING_SYNC_VERSION,
      packageName: '@test/app',
      hostProjectId: project.id,
      generatedAt: new Date().toISOString(),
      seedPolicy: 'merge-new-only',
      sections: ['Backlog', 'S0 · Decisions', 'Done'],
      upserts: [
        {
          planItemId: 'PM-001',
          title: 'Decision task',
          completed: false,
          sectionName: 'S0 · Decisions',
          priority: 'high',
        },
      ],
    })

    const names = (await db.sections.where('projectId').equals(project.id).toArray()).map(
      (section) => section.name,
    )
    expect(names).not.toContain('Sprint 0')
    expect(names).toContain('S0 · Decisions')
  })
})
