import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { makeExportData, makeProject } from '@/test/db-helpers'
import {
  configureDevMirror,
  DEV_MIRROR_LS_KEY,
  readDevMirrorFromLocalStorage,
  restoreDevMirrorIfEmpty,
  shouldSkipDevMirror,
  writeDevMirrorToLocalStorage,
} from '@/lib/dev-mirror'
import { clearDb } from '@/test/db-helpers'
import { db } from '@/db/schema'

describe('dev-mirror', () => {
  beforeEach(async () => {
    configureDevMirror({ skip: false, enabled: true })
    localStorage.clear()
    await clearDb()
  })

  afterEach(() => {
    configureDevMirror({ skip: false, enabled: null })
  })

  it('skips restore for e2e embed harness config', () => {
    expect(
      shouldSkipDevMirror({
        embedded: true,
        hostProjectId: 'e2e-talemail-host-project',
      }),
    ).toBe(true)
  })

  it('round-trips mirror JSON in localStorage', () => {
    const data = makeExportData({ projects: [makeProject({ name: 'Mirror me' })] })
    writeDevMirrorToLocalStorage(data)
    const read = readDevMirrorFromLocalStorage()
    expect(read?.projects[0]?.name).toBe('Mirror me')
    expect(localStorage.getItem(DEV_MIRROR_LS_KEY)).toContain('Mirror me')
  })

  it('restores from localStorage when the database is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const data = makeExportData({ projects: [makeProject({ id: 'restored-project', name: 'Restored' })] })
    writeDevMirrorToLocalStorage(data)

    const result = await restoreDevMirrorIfEmpty()

    expect(result).toEqual({
      restored: true,
      source: 'localStorage',
      projectCount: 1,
    })
    expect(await db.projects.get('restored-project')).toMatchObject({ name: 'Restored' })
    vi.unstubAllGlobals()
  })

  it('does not restore when the database already has data', async () => {
    writeDevMirrorToLocalStorage(makeExportData({ projects: [makeProject({ id: 'mirror-only' })] }))
    await db.projects.add(makeProject({ id: 'live-project', name: 'Live' }))

    const result = await restoreDevMirrorIfEmpty()

    expect(result.restored).toBe(false)
    expect(await db.projects.get('mirror-only')).toBeUndefined()
    expect(await db.projects.get('live-project')).toMatchObject({ name: 'Live' })
  })
})
