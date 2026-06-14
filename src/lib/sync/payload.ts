import type { ExportData, SyncSlice } from '@/models/types'
import { validateExportData } from '@/lib/export-import'
import { mergePreferNewerBaseline, mergeSyncSources } from '@/lib/sync/merge'

export const SYNC_SLICE_VERSION = 1 as const
export const SYNC_MIRROR_KEY = 'projocalypseSyncMirror'
export const SYNC_CLOUD_KEY = 'projocalypseSyncCloud'
export const SYNC_FILE_NAME = 'projocalypse-sync.json'

export function syncJsonByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length
}

/** Soft localStorage budget; file sync has no practical cap. */
export const SYNC_LOCAL_STORAGE_SOFT_MAX_BYTES = 4_000_000

export function isSyncPayloadTooLargeForLocalStorage(slice: SyncSlice): boolean {
  return syncJsonByteLength(slice) > SYNC_LOCAL_STORAGE_SOFT_MAX_BYTES
}

export function exportToSyncSlice(data: ExportData): SyncSlice {
  return {
    version: SYNC_SLICE_VERSION,
    syncedAt: data.exportedAt,
    projects: data.projects,
    sections: data.sections,
    tasks: data.tasks,
    subtasks: data.subtasks,
  }
}

export function syncSliceToExportData(slice: SyncSlice): ExportData {
  return {
    version: 1,
    exportedAt: slice.syncedAt,
    projects: slice.projects,
    sections: slice.sections,
    tasks: slice.tasks,
    subtasks: slice.subtasks,
  }
}

export function validateSyncSlice(data: unknown): SyncSlice {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid sync payload — expected a JSON object at the top level.')
  }
  const record = data as Record<string, unknown>
  const syncedAt = record.syncedAt
  if (typeof syncedAt !== 'number' || Number.isNaN(syncedAt)) {
    throw new Error('Invalid sync payload — "syncedAt" must be a number.')
  }
  const exportData = validateExportData({
    ...record,
    version: 1,
    exportedAt: syncedAt,
  })
  return exportToSyncSlice(exportData)
}

export function parseSyncJson(text: string): SyncSlice {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON — the sync file could not be parsed.')
  }
  return validateSyncSlice(parsed)
}

export function encodeSyncSlice(slice: SyncSlice): string {
  return JSON.stringify(slice)
}

export function decodeSyncSlice(text: string): SyncSlice {
  return parseSyncJson(text)
}

export interface SyncSources {
  cloud?: SyncSlice
  mirror?: SyncSlice
}

/** Merge cloud + mirror slices the way Tabocalypse merges storage.sync + local mirror. */
export function mergeSyncSlices(sources: SyncSources): SyncSlice | undefined {
  const { cloud, mirror } = sources
  if (!cloud && !mirror) return undefined

  const projects = mergeSyncSources(cloud?.projects, mirror?.projects)
  const sections = mergeSyncSources(cloud?.sections, mirror?.sections)
  const tasks = mergeSyncSources(cloud?.tasks, mirror?.tasks)
  const subtasks = mergeSyncSources(cloud?.subtasks, mirror?.subtasks)

  return {
    version: SYNC_SLICE_VERSION,
    syncedAt: Math.max(cloud?.syncedAt ?? 0, mirror?.syncedAt ?? 0),
    projects,
    sections,
    tasks,
    subtasks,
  }
}

/** Merge a reload from sync with unsaved in-memory baseline (Tabocalypse hydration pattern). */
export function mergeSyncWithBaseline(baseline: SyncSlice, incoming: SyncSlice): SyncSlice {
  return {
    version: SYNC_SLICE_VERSION,
    syncedAt: Math.max(baseline.syncedAt, incoming.syncedAt),
    projects: mergePreferNewerBaseline(baseline.projects, incoming.projects),
    sections: mergePreferNewerBaseline(baseline.sections, incoming.sections),
    tasks: mergePreferNewerBaseline(baseline.tasks, incoming.tasks),
    subtasks: mergePreferNewerBaseline(baseline.subtasks, incoming.subtasks),
  }
}

