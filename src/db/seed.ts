import { v4 as uuidv4 } from 'uuid'
import { db } from './schema'

export async function seedIfEmpty(): Promise<void> {
  const count = await db.projects.count()
  if (count > 0) return

  const now = Date.now()
  const projectId = uuidv4()
  const todoSectionId = uuidv4()
  const inProgressSectionId = uuidv4()
  const doneSectionId = uuidv4()

  await db.transaction('rw', db.projects, db.sections, db.tasks, async () => {
    await db.projects.add({
      id: projectId,
      name: 'Getting Started',
      color: '#4573D2',
      archived: false,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })

    await db.sections.bulkAdd([
      { id: todoSectionId, projectId, name: 'To Do', sortOrder: 0 },
      { id: inProgressSectionId, projectId, name: 'In Progress', sortOrder: 1 },
      { id: doneSectionId, projectId, name: 'Done', sortOrder: 2 },
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
        completedAt: null,
      },
    ])
  })
}
