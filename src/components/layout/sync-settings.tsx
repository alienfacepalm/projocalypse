import { useState } from 'react'
import { Cloud, CloudOff, FilePlus2, FolderOpen, RefreshCw } from 'lucide-react'
import {
  createAndLinkSyncFile,
  isSyncFileApiSupported,
  isSyncFileLinked,
  linkSyncFile,
  pushLocalSync,
  unlinkSyncFile,
  type SyncStatus,
} from '@/lib/sync/browser-sync'
import { SYNC_FILE_NAME } from '@/lib/sync/payload'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'

interface SyncSettingsItemsProps {
  status: SyncStatus
}

function formatSyncedAt(ms: number | null): string {
  if (!ms) return 'Not synced yet'
  return new Date(ms).toLocaleString()
}

export function SyncSettingsItems({ status }: SyncSettingsItemsProps) {
  const [busy, setBusy] = useState(false)
  const fileApi = isSyncFileApiSupported()
  const linked = isSyncFileLinked() || status.fileLinked

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync action failed.'
      alert(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={busy}>
          <Cloud className="mr-2 h-4 w-4" />
          Browser sync
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-64">
          <DropdownMenuItem disabled className="text-xs text-muted-foreground whitespace-normal">
            {linked
              ? `Linked to ${SYNC_FILE_NAME}. Place the file in iCloud, Dropbox, or Google Drive to sync across devices.`
              : 'Syncs across tabs on this browser. Link a sync file for cross-device sync (no server).'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {fileApi ? (
            linked ? (
              <>
                <DropdownMenuItem onClick={() => run(() => linkSyncFile())}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Choose different sync file
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => run(() => unlinkSyncFile())}>
                  <CloudOff className="mr-2 h-4 w-4" />
                  Unlink sync file
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={() => run(() => createAndLinkSyncFile())}>
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  Create sync file…
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => run(() => linkSyncFile())}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Link existing sync file…
                </DropdownMenuItem>
              </>
            )
          ) : (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground whitespace-normal">
              Linked sync files require a Chromium-based browser with File System Access API.
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => run(() => pushLocalSync())}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync now
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-xs text-muted-foreground whitespace-normal">
            Last sync: {formatSyncedAt(status.lastSyncedAt)}
            {status.lastError ? ` — ${status.lastError}` : ''}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
    </>
  )
}
