import type { EmbedConfig } from '@/lib/embed'
import { installDevMirrorAutoBackup } from '@/lib/dev-mirror'
import { ensureDatabase } from '@/db/schema'
import { initProjocalypseStorage } from '@/lib/storage-namespace'

/** Boot storage namespace, Dexie database, and dev mirror hooks for this mount. */
export function bootProjocalypseRuntime(embed?: Partial<EmbedConfig>): string {
  const namespace = initProjocalypseStorage(embed)
  ensureDatabase(namespace)
  installDevMirrorAutoBackup()
  return namespace
}
