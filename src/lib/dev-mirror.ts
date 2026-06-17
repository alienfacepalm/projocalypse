import { db } from '@/db/schema'
import { exportData, importData, validateExportData } from '@/lib/export-import'
import type { ExportData } from '@/models/types'
import {
  isDevMirrorAutoBackupSuspended,
  resumeDevMirrorAutoBackup,
  suspendDevMirrorAutoBackup,
} from '@/lib/dev-mirror-guard'
import { devMirrorLsKey } from '@/lib/storage-namespace'
import { DEV_MIRROR_DISK_URL } from '@/lib/dev-mirror-keys'
import type { EmbedConfig } from '@/lib/embed'
import { E2E_EMBED_PROJECT_ID } from '@/e2e/embed-constants'
import type { Table } from 'dexie'

export { DEV_MIRROR_DISK_URL } from '@/lib/dev-mirror-keys'
let skipDevMirror = false
let devMirrorEnabledOverride: boolean | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
const PUSH_DEBOUNCE_MS = 400

export function isDevMirrorEnabled(): boolean {
  if (devMirrorEnabledOverride !== null) return devMirrorEnabledOverride
  return import.meta.env.DEV && import.meta.env.MODE !== 'test'
}

export function configureDevMirror(options: { skip?: boolean; enabled?: boolean | null }): void {
  if (options.skip !== undefined) skipDevMirror = options.skip
  if (options.enabled !== undefined) devMirrorEnabledOverride = options.enabled
}

export function shouldSkipDevMirror(embed?: Partial<EmbedConfig>): boolean {
  if (skipDevMirror) return true
  return embed?.embedded === true && embed.hostProjectId === E2E_EMBED_PROJECT_ID
}

export async function isDatabaseEmpty(): Promise<boolean> {
  const [projectCount, taskCount, developerCount] = await Promise.all([
    db.projects.count(),
    db.tasks.count(),
    db.developers.count(),
  ])
  return projectCount === 0 && taskCount === 0 && developerCount === 0
}

export function readDevMirrorFromLocalStorage(): ExportData | undefined {
  try {
    const raw = localStorage.getItem(devMirrorLsKey())
    if (!raw) return undefined
    return validateExportData(JSON.parse(raw))
  } catch {
    return undefined
  }
}

export function writeDevMirrorToLocalStorage(data: ExportData): boolean {
  try {
    localStorage.setItem(devMirrorLsKey(), JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export async function readDevMirrorFromDisk(): Promise<ExportData | undefined> {
  if (!isDevMirrorEnabled()) return undefined
  try {
    const response = await fetch(DEV_MIRROR_DISK_URL)
    if (!response.ok) return undefined
    const raw = await response.text()
    if (!raw.trim() || raw.trim() === '{}') return undefined
    return validateExportData(JSON.parse(raw))
  } catch {
    return undefined
  }
}

export async function writeDevMirrorToDisk(data: ExportData): Promise<boolean> {
  if (!isDevMirrorEnabled()) return false
  try {
    const response = await fetch(DEV_MIRROR_DISK_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.ok || response.status === 204
  } catch {
    return false
  }
}

export async function loadDevMirrorCandidate(): Promise<ExportData | undefined> {
  const local = readDevMirrorFromLocalStorage()
  const disk = await readDevMirrorFromDisk()

  if (!local && !disk) return undefined
  if (!local) return disk
  if (!disk) return local
  return local.exportedAt >= disk.exportedAt ? local : disk
}

export interface DevMirrorRestoreResult {
  restored: boolean
  source: 'localStorage' | 'disk' | null
  projectCount: number
}

export async function restoreDevMirrorIfEmpty(
  embed?: Partial<EmbedConfig>,
): Promise<DevMirrorRestoreResult> {
  if (!isDevMirrorEnabled() || shouldSkipDevMirror(embed)) {
    return { restored: false, source: null, projectCount: 0 }
  }

  if (!(await isDatabaseEmpty())) {
    return { restored: false, source: null, projectCount: 0 }
  }

  const candidate = await loadDevMirrorCandidate()
  if (!candidate || candidate.projects.length === 0) {
    return { restored: false, source: null, projectCount: 0 }
  }

  const local = readDevMirrorFromLocalStorage()
  const disk = await readDevMirrorFromDisk()
  const source =
    local && local.exportedAt === candidate.exportedAt
      ? 'localStorage'
      : disk && disk.exportedAt === candidate.exportedAt
        ? 'disk'
        : local && (!disk || local.exportedAt >= disk.exportedAt)
          ? 'localStorage'
          : 'disk'

  suspendDevMirrorAutoBackup()
  try {
    await importData(candidate)
  } catch (err) {
    resumeDevMirrorAutoBackup()
    throw err
  }

  if (import.meta.env.DEV) {
    console.info(
      `[projocalypse] Restored ${candidate.projects.length} project(s) from dev mirror (${source}).`,
    )
  }

  resumeDevMirrorAutoBackup()
  scheduleDevMirrorPush()

  return {
    restored: true,
    source,
    projectCount: candidate.projects.length,
  }
}

export async function pushDevMirrorNow(): Promise<void> {
  if (!isDevMirrorEnabled() || skipDevMirror) return
  if (await isDatabaseEmpty()) return

  const data = await exportData()
  writeDevMirrorToLocalStorage(data)
  await writeDevMirrorToDisk(data)
}

export function scheduleDevMirrorPush(): void {
  if (!isDevMirrorEnabled() || skipDevMirror || isDevMirrorAutoBackupSuspended()) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void pushDevMirrorNow()
  }, PUSH_DEBOUNCE_MS)
}

export async function flushDevMirrorBackup(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  await pushDevMirrorNow()
}

const MIRRORED_TABLES: Table<unknown, string>[] = [
  db.projects,
  db.sections,
  db.tasks,
  db.subtasks,
  db.developers,
  db.tombstones,
]

let autoBackupInstalled = false

function onDbMutation(): void {
  scheduleDevMirrorPush()
}

export function installDevMirrorAutoBackup(): void {
  if (!isDevMirrorEnabled() || autoBackupInstalled || typeof window === 'undefined') return
  autoBackupInstalled = true

  for (const table of MIRRORED_TABLES) {
    table.hook('creating', onDbMutation)
    table.hook('updating', onDbMutation)
    table.hook('deleting', onDbMutation)
  }

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flushDevMirrorBackup()
    }
  })

  window.addEventListener('pagehide', () => {
    void flushDevMirrorBackup()
  })
}
