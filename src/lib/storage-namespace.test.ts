import { describe, expect, it, afterEach } from 'vitest'
import {
  activateStorageNamespace,
  configureProjocalypseStorage,
  DEFAULT_STORAGE_NAMESPACE,
  dexieDatabaseName,
  devMirrorLsKey,
  namespacedStorageKey,
  normalizeStorageNamespace,
  resetStorageNamespaceForTests,
  resolveStorageNamespace,
  syncMirrorKey,
} from '@/lib/storage-namespace'

describe('storage-namespace', () => {
  afterEach(() => {
    resetStorageNamespaceForTests()
  })
  it('keeps legacy Dexie name for the default namespace', () => {
    activateStorageNamespace(DEFAULT_STORAGE_NAMESPACE)
    expect(dexieDatabaseName()).toBe('pm-tool')
    expect(devMirrorLsKey()).toBe('projocalypseDevMirror')
  })

  it('derives namespace from packageName', () => {
    expect(resolveStorageNamespace({ packageName: '@talemail/web' })).toBe('talemail__web')
    expect(dexieDatabaseName('talemail__web')).toBe('pm-tool--talemail__web')
    expect(namespacedStorageKey('projocalypseDevMirror', 'talemail__web')).toBe(
      'projocalypseDevMirror--talemail__web',
    )
    expect(syncMirrorKey('talemail__web')).toBe('projocalypseSyncMirror--talemail__web')
  })

  it('prefers explicit storageNamespace and pre-boot configure', () => {
    configureProjocalypseStorage({ storageNamespace: 'host-a' })
    expect(resolveStorageNamespace({ packageName: '@other/pkg' })).toBe('host-a')
    configureProjocalypseStorage({ packageName: '@reset/me' })
    expect(resolveStorageNamespace()).toBe('reset__me')
    resetStorageNamespaceForTests()
  })

  it('normalizes unsafe namespace values', () => {
    expect(normalizeStorageNamespace('  Foo Bar!  ')).toBe('Foo-Bar')
  })
})
