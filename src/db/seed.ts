import { v4 as uuidv4 } from 'uuid'
import { deleteProject } from './operations'
import { db } from './schema'

const GETTING_STARTED_NAME = 'Getting Started'

let seedInFlight: Promise<void> | null = null

export async function seedIfEmpty(): Promise<void> {
  if (!seedInFlight) {
    seedInFlight = doSeedIfEmpty().finally(() => {
      seedInFlight = null
    })
  }
  return seedInFlight
}

async function doSeedIfEmpty(): Promise<void> {
  const now = Date.now()
  const projectId = uuidv4()
  const todoSectionId = uuidv4()
  const inProgressSectionId = uuidv4()
  const doneSectionId = uuidv4()

  await db.transaction('rw', db.projects, db.sections, db.tasks, async () => {
    const count = await db.projects.count()
    if (count > 0) return

    await db.projects.add({
      id: projectId,
      name: GETTING_STARTED_NAME,
      color: '#4573D2',
      archived: false,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })

    await db.sections.bulkAdd([
      { id: todoSectionId, projectId, name: 'To Do', sortOrder: 0, updatedAt: now },
      { id: inProgressSectionId, projectId, name: 'In Progress', sortOrder: 1, updatedAt: now },
      { id: doneSectionId, projectId, name: 'Done', sortOrder: 2, updatedAt: now },
    ])

    await db.tasks.bulkAdd([
      {
        id: uuidv4(),
        projectId,
        sectionId: todoSectionId,
        title: 'Explore your new project',
        description: 'Click a task to open the detail panel and add notes.',
        completed: false,
        dueDate: now + 86400000,
        priority: 'medium',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      },
      {
        id: uuidv4(),
        projectId,
        sectionId: todoSectionId,
        title: 'Create your first task',
        description: '',
        completed: false,
        dueDate: null,
        priority: 'none',
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      },
      {
        id: uuidv4(),
        projectId,
        sectionId: inProgressSectionId,
        title: 'Try the board view',
        description: 'Switch between List and Board using the toggle in the header.',
        completed: false,
        dueDate: now + 172800000,
        priority: 'high',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      },
    ])
  })
}

/** Keep the oldest "Getting Started" project; remove any duplicates (e.g. StrictMode double-seed or sync merge). */
export async function removeDuplicateGettingStartedProjects(): Promise<void> {
  const matches = await db.projects.filter((p) => p.name === GETTING_STARTED_NAME).toArray()
  if (matches.length <= 1) return

  matches.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  const duplicates = matches.slice(1)
  for (const project of duplicates) {
    await deleteProject(project.id)
  }
}

export async function initializeDatabase(): Promise<void> {
  await seedIfEmpty()
  await removeDuplicateGettingStartedProjects()
}
