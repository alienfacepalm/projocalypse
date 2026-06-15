import { describe, expect, it } from 'vitest'
import { PENDING_SYNC_VERSION } from '@projocalypse/core'
import { applyPendingSync, createHostProject } from '@/lib/host-bridge'
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
})
