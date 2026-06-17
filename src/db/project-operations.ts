import { v4 as uuidv4 } from 'uuid'
import { recordTombstones } from '@/db/tombstones'
import { requirePermission } from '@/db/operations-helpers'
import { db } from '@/db/schema'
import { DeveloperPermissionError } from '@/lib/permissions'
import type { Developer, Project } from '@/models/types'

export async function createProject(name: string, color: string, actor?: Developer): Promise<Project> {
  if (actor) {
    requirePermission(actor, 'manageProjects')
  } else {
    const totalDevelopers = await db.developers.count()
    if (totalDevelopers > 0) {
      throw new DeveloperPermissionError('Missing permission: manageProjects')
    }
  }
  const now = Date.now()
  const count = await db.projects.filter((p) => !p.archived).count()
  const project: Project = {
    id: uuidv4(),
    name,
    color,
    archived: false,
    sortOrder: count,
    createdAt: now,
    updatedAt: now,
  }

  const todoSectionId = uuidv4()
  const inProgressSectionId = uuidv4()
  const doneSectionId = uuidv4()
  await db.transaction('rw', db.projects, db.sections, async () => {
    await db.projects.add(project)
    await db.sections.bulkAdd([
      { id: todoSectionId, projectId: project.id, name: 'To Do', sortOrder: 0, updatedAt: now },
      { id: inProgressSectionId, projectId: project.id, name: 'In Progress', sortOrder: 1, updatedAt: now },
      { id: doneSectionId, projectId: project.id, name: 'Done', sortOrder: 2, updatedAt: now },
    ])
  })

  return project
}

export async function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'color' | 'archived'>>): Promise<void> {
  await db.projects.update(id, { ...updates, updatedAt: Date.now() })
}

export async function unarchiveProject(id: string): Promise<void> {
  await updateProject(id, { archived: false })
}

export async function reorderProjects(updates: { id: string; sortOrder: number }[]): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.projects, async () => {
    for (const update of updates) {
      await db.projects.update(update.id, { sortOrder: update.sortOrder, updatedAt: now })
    }
  })
}

export async function archiveProject(id: string): Promise<void> {
  await updateProject(id, { archived: true })
}

export async function deleteProject(actor: Developer, id: string): Promise<void> {
  requirePermission(actor, 'manageProjects')
  await deleteProjectUnsafe(id)
}

/** System cleanup (imports, migrations) without a permission actor. */
export async function deleteProjectSystem(id: string): Promise<void> {
  await deleteProjectUnsafe(id)
}

async function deleteProjectUnsafe(id: string): Promise<void> {
  const sections = await db.sections.where('projectId').equals(id).toArray()
  const tasks = await db.tasks.where('projectId').equals(id).toArray()
  const subtasks = await Promise.all(tasks.map((task) => db.subtasks.where('taskId').equals(task.id).toArray()))
  const tombstoneItems = [
    { id, entityType: 'project' as const },
    ...sections.map((section) => ({ id: section.id, entityType: 'section' as const })),
    ...tasks.map((task) => ({ id: task.id, entityType: 'task' as const })),
    ...subtasks.flat().map((subtask) => ({ id: subtask.id, entityType: 'subtask' as const })),
  ]

  await db.transaction('rw', [db.projects, db.sections, db.tasks, db.subtasks, db.developers], async () => {
    for (const task of tasks) {
      await db.subtasks.where('taskId').equals(task.id).delete()
    }
    await db.tasks.where('projectId').equals(id).delete()
    await db.sections.where('projectId').equals(id).delete()
    await db.developers.where('projectId').equals(id).delete()
    await db.projects.delete(id)
  })
  await recordTombstones(tombstoneItems)
}

const GETTING_STARTED_NAME = 'Getting Started'

/** Removes legacy demo projects seeded in earlier versions. */
export async function removeGettingStartedProjects(): Promise<void> {
  const projects = await db.projects.filter((p) => p.name === GETTING_STARTED_NAME).toArray()
  for (const project of projects) {
    await deleteProjectSystem(project.id)
  }
}
