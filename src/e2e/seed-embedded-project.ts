import { db } from '@/db/schema'
import { makeMasterDeveloper, makeProject, makeSection } from '@/test/db-helpers'
import { DEV_MIRROR_LS_KEY } from '@/lib/dev-mirror-keys'
import { SYNC_CLOUD_KEY, SYNC_MIRROR_KEY } from '@/lib/sync/payload'
import { E2E_EMBED_PROJECT_ID, E2E_EMBED_PROJECT_NAME } from '@/e2e/embed-constants'

export { E2E_EMBED_PROJECT_ID, E2E_EMBED_PROJECT_NAME } from '@/e2e/embed-constants'

const PRESERVED_LOCAL_STORAGE_KEYS = new Set([
  DEV_MIRROR_LS_KEY,
  SYNC_MIRROR_KEY,
  SYNC_CLOUD_KEY,
  'projocalypse-appearance',
  'theme',
])

function clearLocalStorageExceptPreserved(): void {
  const preserved = new Map<string, string>()
  for (const key of PRESERVED_LOCAL_STORAGE_KEYS) {
    const value = localStorage.getItem(key)
    if (value !== null) preserved.set(key, value)
  }
  localStorage.clear()
  for (const [key, value] of preserved) {
    localStorage.setItem(key, value)
  }
}

/** Seeds IndexedDB for Talemail-style embed: fixed host project + master developer + sections. */
export async function seedEmbeddedTalemailProject(): Promise<string> {
  await db.delete()
  await db.open()

  const project = makeProject({
    id: E2E_EMBED_PROJECT_ID,
    name: E2E_EMBED_PROJECT_NAME,
    color: '#8B5CF6',
  })
  const sections = [
    makeSection({ id: 'e2e-section-todo', projectId: E2E_EMBED_PROJECT_ID, name: 'To Do', sortOrder: 0 }),
    makeSection({
      id: 'e2e-section-progress',
      projectId: E2E_EMBED_PROJECT_ID,
      name: 'In Progress',
      sortOrder: 1,
    }),
    makeSection({ id: 'e2e-section-done', projectId: E2E_EMBED_PROJECT_ID, name: 'Done', sortOrder: 2 }),
  ]
  const developer = makeMasterDeveloper({
    id: 'e2e-dev-master',
    projectId: E2E_EMBED_PROJECT_ID,
    name: 'Test Author',
  })

  await db.transaction('rw', db.projects, db.sections, db.developers, async () => {
    await db.projects.add(project)
    await db.sections.bulkAdd(sections)
    await db.developers.add(developer)
  })

  clearLocalStorageExceptPreserved()
  return E2E_EMBED_PROJECT_ID
}
