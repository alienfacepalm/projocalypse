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
  const [projects, sections, tasks, subtasks] = await Promise.all([
    db.projects.toArray(),
    db.sections.toArray(),
    db.tasks.toArray(),
    db.subtasks.toArray(),
  ])
  const maxUpdatedAt = Math.max(
    0,
    ...projects.map((p) => p.updatedAt),
    ...sections.map((s) => s.updatedAt),
    ...tasks.map((t) => t.updatedAt),
    ...subtasks.map((s) => s.updatedAt),
  )
  return `${projects.length}-${sections.length}-${tasks.length}-${subtasks.length}-${maxUpdatedAt}`
}

export function useBrowserSync(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus())
  const revision = useLiveQuery(getDbRevision, [])

  useEffect(() => {
    let stopListeners: (() => void) | undefined
    void initBrowserSync().then(() => {
      stopListeners = startSyncListeners()
    })
    const unsubscribe = subscribeSyncStatus(setStatus)
    return () => {
      stopListeners?.()
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (revision === undefined) return
    schedulePushLocalSync()
  }, [revision])

  return status
}
