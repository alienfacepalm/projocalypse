import { describe, expect, it } from 'vitest'
import {
  decodeSyncSlice,
  encodeSyncSlice,
  exportToSyncSlice,
  mergeSyncSlices,
  mergeSyncWithBaseline,
  parseSyncJson,
  validateSyncSlice,
} from '@/lib/sync/payload'
import { makeExportData, makeProject, makeTask } from '@/test/db-helpers'

describe('sync payload encode/decode', () => {
  it('round-trips through JSON', () => {
    const slice = exportToSyncSlice(makeExportData())
    const text = encodeSyncSlice(slice)
    expect(decodeSyncSlice(text).projects[0]?.name).toBe('Test Project')
  })

  it('parseSyncJson validates structure', () => {
    const slice = exportToSyncSlice(makeExportData({ exportedAt: 12345 }))
    const parsed = parseSyncJson(JSON.stringify(slice))
    expect(parsed.syncedAt).toBe(12345)
  })

  it('rejects invalid syncedAt', () => {
    expect(() => validateSyncSlice({ version: 1, projects: [], sections: [], tasks: [], subtasks: [] })).toThrow(
      /syncedAt/,
    )
  })
})

describe('mergeSyncSlices', () => {
  it('merges cloud and mirror entities', () => {
    const cloud = exportToSyncSlice(
      makeExportData({
        projects: [makeProject({ id: 'p1', name: 'Cloud wins', updatedAt: 500 })],
        exportedAt: 500,
      }),
    )
    const mirror = exportToSyncSlice(
      makeExportData({
        projects: [makeProject({ id: 'p1', name: 'Mirror', updatedAt: 100 })],
        exportedAt: 100,
      }),
    )
    const merged = mergeSyncSlices({ cloud, mirror })
    expect(merged?.projects[0]?.name).toBe('Cloud wins')
    expect(merged?.syncedAt).toBe(500)
  })

  it('returns undefined when both sources empty', () => {
    expect(mergeSyncSlices({})).toBeUndefined()
  })
})

describe('mergeSyncWithBaseline', () => {
  it('preserves unsaved baseline edits with newer timestamps', () => {
    const baseline = exportToSyncSlice(
      makeExportData({
        tasks: [makeTask({ id: 't1', title: 'Typing…', updatedAt: 999 })],
        exportedAt: 999,
      }),
    )
    const incoming = exportToSyncSlice(
      makeExportData({
        tasks: [makeTask({ id: 't1', title: 'Stale', updatedAt: 100 })],
        exportedAt: 100,
      }),
    )
    const merged = mergeSyncWithBaseline(baseline, incoming)
    expect(merged.tasks[0]?.title).toBe('Typing…')
  })
})
