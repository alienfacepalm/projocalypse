import { db } from '@/db/schema'
import { makeMasterDeveloper, makeProject, makeSection } from '@/test/db-helpers'

export const E2E_EMBED_PROJECT_ID = 'e2e-talemail-host-project'
export const E2E_EMBED_PROJECT_NAME = 'Talemail Test Book'

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

  localStorage.clear()
  return E2E_EMBED_PROJECT_ID
}
