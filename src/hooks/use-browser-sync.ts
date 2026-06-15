import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import {
  getSyncStatus,
  initBrowserSync,
  schedulePushLocalSync,
  startSyncListeners,
  subscribeSyncStatus,
  type SyncStatus,
} from '@/lib/sync/browser-sync'

async function getDbRevision(): Promise<string> {
  const [projects, sections, tasks, subtasks, tombstones] = await Promise.all([
    db.projects.toArray(),
    db.sections.toArray(),
    db.tasks.toArray(),
    db.subtasks.toArray(),
    db.tombstones.toArray(),
  ])
  const maxUpdatedAt = Math.max(
    0,
    ...projects.map((p) => p.updatedAt),
    ...sections.map((s) => s.updatedAt),
    ...tasks.map((t) => t.updatedAt),
    ...subtasks.map((s) => s.updatedAt),
  )
  return `${projects.length}-${sections.length}-${tasks.length}-${subtasks.length}-${tombstones.length}-${maxUpdatedAt}`
}

export function useBrowserSync(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus())
  const revision = useLiveQuery(getDbRevision, [])

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(setStatus)
    return unsubscribe
  }, [])

  useEffect(() => {
    if (revision === undefined) return
    schedulePushLocalSync()
  }, [revision])

  return status
}

/** Call once at app root so embed mode (no sidebar) still syncs and restores. */
export function useBrowserSyncInit(onRemoteChange?: () => void): void {
  useEffect(() => {
    let stopListeners: (() => void) | undefined
    void initBrowserSync().then(() => {
      stopListeners = startSyncListeners(onRemoteChange)
    })
    return () => {
      stopListeners?.()
    }
  }, [onRemoteChange])
}
