import type { ExportData, SyncSlice, Tombstone, TombstoneEntityType } from '@/models/types'
import { validateExportData } from '@/lib/export-import'
import { filterByTombstones, mergeTombstoneLists, tombstoneMap } from '@/db/tombstones'
import { mergePreferNewerBaseline, mergeSyncSources } from '@/lib/sync/merge'

export const SYNC_SLICE_VERSION = 3 as const
export const SYNC_MIRROR_KEY = 'projocalypseSyncMirror'
export const SYNC_CLOUD_KEY = 'projocalypseSyncCloud'
export const SYNC_FILE_NAME = 'projocalypse-sync.json'

const TOMBSTONE_ENTITY_TYPES = new Set<TombstoneEntityType>(['project', 'section', 'task', 'subtask'])

export function syncJsonByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length
}

/** Soft localStorage budget; file sync has no practical cap. */
export const SYNC_LOCAL_STORAGE_SOFT_MAX_BYTES = 4_000_000

export function isSyncPayloadTooLargeForLocalStorage(slice: SyncSlice): boolean {
  return syncJsonByteLength(slice) > SYNC_LOCAL_STORAGE_SOFT_MAX_BYTES
}

function parseTombstones(raw: unknown): Tombstone[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) {
    throw new Error('Invalid sync payload — "tombstones" must be an array when present.')
  }
  return raw.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Invalid sync payload — tombstones[${index}] must be an object.`)
    }
    const record = item as Record<string, unknown>
    const entityType = record.entityType
    if (typeof entityType !== 'string' || !TOMBSTONE_ENTITY_TYPES.has(entityType as TombstoneEntityType)) {
      throw new Error(`Invalid sync payload — tombstones[${index}].entityType is invalid.`)
    }
    const id = record.id
    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error(`Invalid sync payload — tombstones[${index}].id must be a non-empty string.`)
    }
    const deletedAt = record.deletedAt
    if (typeof deletedAt !== 'number' || Number.isNaN(deletedAt)) {
      throw new Error(`Invalid sync payload — tombstones[${index}].deletedAt must be a number.`)
    }
    return { id, entityType: entityType as TombstoneEntityType, deletedAt }
  })
}

export function exportToSyncSlice(data: ExportData, tombstones: Tombstone[] = []): SyncSlice {
  return {
    version: SYNC_SLICE_VERSION,
    syncedAt: data.exportedAt,
    projects: data.projects,
    sections: data.sections,
    tasks: data.tasks,
    subtasks: data.subtasks,
    developers: data.developers ?? [],
    tombstones,
  }
}

export function syncSliceToExportData(slice: SyncSlice): ExportData {
  return {
    version: slice.developers?.length ? 2 : 1,
    exportedAt: slice.syncedAt,
    projects: slice.projects,
    sections: slice.sections,
    tasks: slice.tasks,
    subtasks: slice.subtasks,
    developers: slice.developers ?? [],
  }
}

export function validateSyncSlice(data: unknown): SyncSlice {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid sync payload — expected a JSON object at the top level.')
  }
  const record = data as Record<string, unknown>
  const version = record.version
  if (version !== 1 && version !== 2 && version !== 3) {
    throw new Error(`Unsupported sync version (${String(version)}).`)
  }
  const syncedAt = record.syncedAt
  if (typeof syncedAt !== 'number' || Number.isNaN(syncedAt)) {
    throw new Error('Invalid sync payload — "syncedAt" must be a number.')
  }
  const exportData = validateExportData({
    ...record,
    version: version === 3 || Array.isArray(record.developers) ? 2 : 1,
    exportedAt: syncedAt,
  })
  const tombstones = parseTombstones(record.tombstones)
  const slice = exportToSyncSlice(exportData, tombstones)
  if (version < 3) {
    return { ...slice, version: version as 1 | 2 }
  }
  return slice
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

function applyTombstonesToSlice(slice: SyncSlice, tombstones: Tombstone[]): SyncSlice {
  const map = tombstoneMap(tombstones)
  return {
    ...slice,
    version: SYNC_SLICE_VERSION,
    tombstones,
    projects: filterByTombstones(slice.projects, map),
    sections: filterByTombstones(slice.sections, map),
    tasks: filterByTombstones(slice.tasks, map),
    subtasks: filterByTombstones(slice.subtasks, map),
    developers: slice.developers ?? [],
  }
}

/** Merge cloud + mirror slices the way Tabocalypse merges storage.sync + local mirror. */
export function mergeSyncSlices(sources: SyncSources): SyncSlice | undefined {
  const { cloud, mirror } = sources
  if (!cloud && !mirror) return undefined

  const tombstones = mergeTombstoneLists(cloud?.tombstones ?? [], mirror?.tombstones ?? [])
  const map = tombstoneMap(tombstones)

  const projects = filterByTombstones(mergeSyncSources(cloud?.projects, mirror?.projects), map)
  const sections = filterByTombstones(mergeSyncSources(cloud?.sections, mirror?.sections), map)
  const tasks = filterByTombstones(mergeSyncSources(cloud?.tasks, mirror?.tasks), map)
  const subtasks = filterByTombstones(mergeSyncSources(cloud?.subtasks, mirror?.subtasks), map)
  const developers = mergeSyncSources(cloud?.developers, mirror?.developers)

  return {
    version: SYNC_SLICE_VERSION,
    syncedAt: Math.max(cloud?.syncedAt ?? 0, mirror?.syncedAt ?? 0),
    projects,
    sections,
    tasks,
    subtasks,
    developers,
    tombstones,
  }
}

/** Merge a reload from sync with unsaved in-memory baseline (Tabocalypse hydration pattern). */
export function mergeSyncWithBaseline(baseline: SyncSlice, incoming: SyncSlice): SyncSlice {
  const tombstones = mergeTombstoneLists(baseline.tombstones ?? [], incoming.tombstones ?? [])
  const map = tombstoneMap(tombstones)
  return applyTombstonesToSlice(
    {
      version: SYNC_SLICE_VERSION,
      syncedAt: Math.max(baseline.syncedAt, incoming.syncedAt),
      projects: mergePreferNewerBaseline(baseline.projects, incoming.projects, map),
      sections: mergePreferNewerBaseline(baseline.sections, incoming.sections, map),
      tasks: mergePreferNewerBaseline(baseline.tasks, incoming.tasks, map),
      subtasks: mergePreferNewerBaseline(baseline.subtasks, incoming.subtasks, map),
      developers: mergePreferNewerBaseline(baseline.developers ?? [], incoming.developers ?? [], map),
      tombstones,
    },
    tombstones,
  )
}
