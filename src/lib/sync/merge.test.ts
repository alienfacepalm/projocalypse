import { describe, expect, it } from 'vitest'
import { mergePreferNewerBaseline, mergeSyncSources } from '@/lib/sync/merge'
import { makeProject, makeTask } from '@/test/db-helpers'

describe('mergePreferNewerBaseline', () => {
  it('keeps baseline when it is newer', () => {
    const baseline = [makeProject({ id: 'a', name: 'Local', updatedAt: 200 })]
    const incoming = [makeProject({ id: 'a', name: 'Remote', updatedAt: 100 })]
    expect(mergePreferNewerBaseline(baseline, incoming)[0]?.name).toBe('Local')
  })

  it('takes incoming when it is newer', () => {
    const baseline = [makeProject({ id: 'a', name: 'Local', updatedAt: 100 })]
    const incoming = [makeProject({ id: 'a', name: 'Remote', updatedAt: 200 })]
    expect(mergePreferNewerBaseline(baseline, incoming)[0]?.name).toBe('Remote')
  })

  it('prefers baseline on equal updatedAt', () => {
    const baseline = [makeTask({ id: 't1', title: 'Local', updatedAt: 100 })]
    const incoming = [makeTask({ id: 't1', title: 'Remote', updatedAt: 100 })]
    expect(mergePreferNewerBaseline(baseline, incoming)[0]?.title).toBe('Local')
  })

  it('drops tombstoned baseline-only ids', () => {
    const baseline = [makeTask({ id: 'local-only', title: 'Only here', updatedAt: 50 })]
    const incoming = [makeTask({ id: 'shared', title: 'Shared', updatedAt: 50 })]
    const tombstones = new Map([['local-only', 100]])
    const merged = mergePreferNewerBaseline(baseline, incoming, tombstones)
    expect(merged.map((t) => t.id)).toEqual(['shared'])
  })

  it('drops tombstoned incoming entities', () => {
    const baseline: ReturnType<typeof makeTask>[] = []
    const incoming = [makeTask({ id: 'deleted', title: 'Gone', updatedAt: 50 })]
    const tombstones = new Map([['deleted', 100]])
    expect(mergePreferNewerBaseline(baseline, incoming, tombstones)).toEqual([])
  })

  it('appends baseline-only ids', () => {
    const baseline = [makeTask({ id: 'local-only', title: 'Only here', updatedAt: 50 })]
    const incoming = [makeTask({ id: 'shared', title: 'Shared', updatedAt: 50 })]
    const merged = mergePreferNewerBaseline(baseline, incoming)
    expect(merged.map((t) => t.id).sort()).toEqual(['local-only', 'shared'])
  })
})

describe('mergeSyncSources', () => {
  it('returns mirror when cloud is empty', () => {
    const mirror = [makeProject({ id: 'a', updatedAt: 10 })]
    expect(mergeSyncSources(undefined, mirror)).toEqual(mirror)
  })

  it('merges cloud and mirror with newer-wins', () => {
    const cloud = [makeProject({ id: 'a', name: 'Cloud', updatedAt: 300 })]
    const mirror = [makeProject({ id: 'a', name: 'Mirror', updatedAt: 100 })]
    expect(mergeSyncSources(cloud, mirror)[0]?.name).toBe('Cloud')
  })
})
