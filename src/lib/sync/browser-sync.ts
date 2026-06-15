import {
  decodeSyncSlice,
  encodeSyncSlice,
  exportToSyncSlice,
  isSyncPayloadTooLargeForLocalStorage,
  mergeSyncSlices,
  mergeSyncWithBaseline,
  SYNC_CLOUD_KEY,
  SYNC_MIRROR_KEY,
  syncJsonByteLength,
  syncSliceToExportData,
  type SyncSources,
  validateSyncSlice,
} from '@/lib/sync/payload'
import { removeGettingStartedProjects } from '@/db/operations'
import { getAllTombstones } from '@/db/tombstones'
import { importSyncData, exportData } from '@/lib/export-import'
import { db } from '@/db/schema'
import type { SyncSlice } from '@/models/types'
import { SYNC_FILE_NAME } from '@/lib/sync/payload'

export interface SyncStatus {
  mirrorAvailable: boolean
  cloudAvailable: boolean
  fileLinked: boolean
  lastSyncedAt: number | null
  lastError: string | null
}

let syncFileHandle: FileSystemFileHandle | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let applyingRemote = false
const statusListeners = new Set<(status: SyncStatus) => void>()
let lastStatus: SyncStatus = {
  mirrorAvailable: false,
  cloudAvailable: false,
  fileLinked: false,
  lastSyncedAt: null,
  lastError: null,
}

const PUSH_DEBOUNCE_MS = 400
const FILE_POLL_MS = 5000

function readMirrorSlice(): SyncSlice | undefined {
  try {
    const raw = localStorage.getItem(SYNC_MIRROR_KEY)
    if (!raw) return undefined
    return validateSyncSlice(JSON.parse(raw))
  } catch {
    return undefined
  }
}

function readCloudSliceFromLocalStorage(): SyncSlice | undefined {
  try {
    const raw = localStorage.getItem(SYNC_CLOUD_KEY)
    if (!raw) return undefined
    return validateSyncSlice(JSON.parse(raw))
  } catch {
    return undefined
  }
}

function writeMirrorSlice(slice: SyncSlice): boolean {
  if (isSyncPayloadTooLargeForLocalStorage(slice)) return false
  try {
    localStorage.setItem(SYNC_MIRROR_KEY, encodeSyncSlice(slice))
    return true
  } catch {
    return false
  }
}

function writeCloudSliceToLocalStorage(slice: SyncSlice): boolean {
  if (isSyncPayloadTooLargeForLocalStorage(slice)) return false
  try {
    localStorage.setItem(SYNC_CLOUD_KEY, encodeSyncSlice(slice))
    return true
  } catch {
    return false
  }
}

async function readCloudSliceFromFile(): Promise<SyncSlice | undefined> {
  if (!syncFileHandle) return undefined
  try {
    const file = await syncFileHandle.getFile()
    if (file.size === 0) return undefined
    return decodeSyncSlice(await file.text())
  } catch {
    return undefined
  }
}

async function writeCloudSliceToFile(slice: SyncSlice): Promise<void> {
  if (!syncFileHandle) return
  const writable = await syncFileHandle.createWritable()
  await writable.write(encodeSyncSlice(slice))
  await writable.close()
}

function notifyStatus(patch: Partial<SyncStatus>): void {
  lastStatus = { ...lastStatus, ...patch }
  for (const listener of statusListeners) {
    listener(lastStatus)
  }
}

export function getSyncStatus(): SyncStatus {
  return lastStatus
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  statusListeners.add(listener)
  listener(lastStatus)
  return () => {
    statusListeners.delete(listener)
  }
}

async function loadSources(): Promise<SyncSources> {
  const mirror = readMirrorSlice()
  const cloudFromStorage = readCloudSliceFromLocalStorage()
  const cloudFromFile = await readCloudSliceFromFile()
  const cloud =
    cloudFromFile && cloudFromStorage
      ? mergeSyncSlices({ cloud: cloudFromFile, mirror: cloudFromStorage })
      : (cloudFromFile ?? cloudFromStorage)
  return { mirror, cloud }
}

export async function buildSyncSliceFromDb(): Promise<SyncSlice> {
  const data = await exportData()
  const tombstones = await getAllTombstones()
  return exportToSyncSlice(data, tombstones)
}

export async function applySyncSliceToDb(slice: SyncSlice): Promise<void> {
  await importSyncData(syncSliceToExportData(slice), slice.tombstones ?? [])
}

export async function loadAndMergeSync(baseline?: SyncSlice): Promise<SyncSlice | undefined> {
  const sources = await loadSources()
  const merged = mergeSyncSlices(sources)
  if (!merged) return undefined
  if (baseline) return mergeSyncWithBaseline(baseline, merged)
  return merged
}

let lastAppliedFingerprint = ''

function fingerprintSyncSlice(slice: SyncSlice): string {
  return syncJsonByteLength(slice) + ':' + slice.syncedAt + ':' + slice.projects.length + slice.tasks.length
}

let pullRemoteMutex: Promise<boolean> = Promise.resolve(false)

export async function pullRemoteSync(baseline?: SyncSlice): Promise<boolean> {
  const result = pullRemoteMutex.then(() => pullRemoteSyncOnce(baseline))
  pullRemoteMutex = result.catch(() => false)
  return result
}

async function pullRemoteSyncOnce(baseline?: SyncSlice): Promise<boolean> {
  const merged = await loadAndMergeSync(baseline)
  if (!merged) return false
  const fingerprint = fingerprintSyncSlice(merged)
  if (!baseline && fingerprint === lastAppliedFingerprint) return false

  applyingRemote = true
  try {
    await applySyncSliceToDb(merged)
    await removeGettingStartedProjects()
    lastAppliedFingerprint = fingerprint
    notifyStatus({
      mirrorAvailable: Boolean(readMirrorSlice()),
      cloudAvailable: Boolean(localStorage.getItem(SYNC_CLOUD_KEY)) || Boolean(syncFileHandle),
      lastSyncedAt: merged.syncedAt,
      lastError: null,
    })
    return true
  } finally {
    applyingRemote = false
  }
}

export async function pushLocalSync(): Promise<void> {
  if (applyingRemote) return

  const slice = await buildSyncSliceFromDb()
  const mirrorWritten = writeMirrorSlice(slice)
  const cloudStorageWritten = writeCloudSliceToLocalStorage(slice)

  try {
    await writeCloudSliceToFile(slice)
    notifyStatus({
      mirrorAvailable: mirrorWritten,
      cloudAvailable: cloudStorageWritten || Boolean(syncFileHandle),
      lastSyncedAt: slice.syncedAt,
      lastError: null,
    })
  } catch (err) {
    if (isSyncQuotaError(err)) {
      notifyStatus({
        mirrorAvailable: mirrorWritten,
        lastError:
          'Sync is changing too fast or hit storage limits. Changes are saved locally — wait a moment before editing again.',
      })
      return
    }
    const message = err instanceof Error ? err.message : 'Sync write failed.'
    notifyStatus({
      mirrorAvailable: mirrorWritten,
      cloudAvailable: cloudStorageWritten || Boolean(syncFileHandle),
      lastError: message,
    })
  }

  if (!mirrorWritten && isSyncPayloadTooLargeForLocalStorage(slice) && !syncFileHandle) {
    notifyStatus({
      lastError:
        'Data is too large for in-browser sync storage. Link a sync file (e.g. in iCloud or Dropbox) to sync across devices.',
    })
  }
}

function isSyncQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return err.message.includes('quota') || err.name === 'QuotaExceededError'
}

export function schedulePushLocalSync(): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void pushLocalSync()
  }, PUSH_DEBOUNCE_MS)
}

function isSyncStorageEvent(event: StorageEvent): boolean {
  return event.key === SYNC_MIRROR_KEY || event.key === SYNC_CLOUD_KEY
}

export function startSyncListeners(onRemoteChange?: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (!isSyncStorageEvent(event)) return
    void pullRemoteSync().then((applied) => {
      if (applied) onRemoteChange?.()
    })
  }

  window.addEventListener('storage', onStorage)

  pollTimer = setInterval(() => {
    if (document.visibilityState !== 'visible' || !syncFileHandle) return
    void pullRemoteSync().then((applied) => {
      if (applied) onRemoteChange?.()
    })
  }, FILE_POLL_MS)

  return () => {
    window.removeEventListener('storage', onStorage)
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }
}

export async function initBrowserSync(): Promise<void> {
  await restoreLinkedSyncFile()
  notifyStatus({
    mirrorAvailable: Boolean(localStorage.getItem(SYNC_MIRROR_KEY)),
    cloudAvailable: Boolean(localStorage.getItem(SYNC_CLOUD_KEY)) || Boolean(syncFileHandle),
    fileLinked: Boolean(syncFileHandle),
  })
  await pullRemoteSync()
  await pushLocalSync()
}

export function isSyncFileApiSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window
}

export async function linkSyncFile(): Promise<void> {
  if (!isSyncFileApiSupported()) {
    throw new Error('Your browser does not support linked sync files. Use Export/Import backup instead.')
  }

  const [handle] = await window.showOpenFilePicker!({
    types: [
      {
        description: 'Projocalypse sync',
        accept: { 'application/json': ['.json'] },
      },
    ],
    multiple: false,
  })

  syncFileHandle = handle
  await persistSyncFileHandle(handle)
  await dbSetFileLinked(true)

  const existing = await readCloudSliceFromFile()
  if (existing) {
    await pullRemoteSync(await buildSyncSliceFromDb())
  } else {
    await pushLocalSync()
  }

  notifyStatus({ fileLinked: true, cloudAvailable: true, lastError: null })
}

export async function createAndLinkSyncFile(): Promise<void> {
  if (!isSyncFileApiSupported()) {
    throw new Error('Your browser does not support linked sync files. Use Export/Import backup instead.')
  }

  const handle = await window.showSaveFilePicker!({
    suggestedName: SYNC_FILE_NAME,
    types: [
      {
        description: 'Projocalypse sync',
        accept: { 'application/json': ['.json'] },
      },
    ],
  })

  syncFileHandle = handle
  await persistSyncFileHandle(handle)
  await dbSetFileLinked(true)
  await pushLocalSync()
  notifyStatus({ fileLinked: true, cloudAvailable: true, lastError: null })
}

export async function unlinkSyncFile(): Promise<void> {
  syncFileHandle = null
  await clearPersistedSyncFileHandle()
  await dbSetFileLinked(false)
  notifyStatus({ fileLinked: false })
}

export function isSyncFileLinked(): boolean {
  return syncFileHandle !== null
}

async function dbSetFileLinked(linked: boolean): Promise<void> {
  const existing = await db.syncMeta.get('sync')
  await db.syncMeta.put({
    id: 'sync',
    fileLinked: linked,
    fileHandle: linked ? existing?.fileHandle : undefined,
  })
}

async function persistSyncFileHandle(handle: FileSystemFileHandle): Promise<void> {
  await db.syncMeta.put({ id: 'sync', fileLinked: true, fileHandle: handle })
}

async function clearPersistedSyncFileHandle(): Promise<void> {
  await db.syncMeta.put({ id: 'sync', fileLinked: false })
}

async function restoreLinkedSyncFile(): Promise<void> {
  const meta = await db.syncMeta.get('sync')
  if (meta?.fileHandle) {
    syncFileHandle = meta.fileHandle
  }
}

export { SYNC_FILE_NAME }
