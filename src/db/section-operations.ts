import { v4 as uuidv4 } from 'uuid'
import { recordTombstones } from '@/db/tombstones'
import { db } from '@/db/schema'
import type { Section } from '@/models/types'

export async function createSection(projectId: string, name: string): Promise<Section> {
  const now = Date.now()
  const count = await db.sections.where('projectId').equals(projectId).count()
  const section: Section = { id: uuidv4(), projectId, name, sortOrder: count, updatedAt: now }
  await db.sections.add(section)
  return section
}

export async function updateSection(id: string, name: string): Promise<void> {
  await db.sections.update(id, { name, updatedAt: Date.now() })
}

export async function reorderSections(updates: { id: string; sortOrder: number }[]): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.sections, async () => {
    for (const update of updates) {
      await db.sections.update(update.id, { sortOrder: update.sortOrder, updatedAt: now })
    }
  })
}

export async function deleteSection(id: string): Promise<void> {
  const tasks = await db.tasks.where('sectionId').equals(id).toArray()
  const subtasks = await Promise.all(tasks.map((task) => db.subtasks.where('taskId').equals(task.id).toArray()))
  const tombstoneItems = [
    { id, entityType: 'section' as const },
    ...tasks.map((task) => ({ id: task.id, entityType: 'task' as const })),
    ...subtasks.flat().map((subtask) => ({ id: subtask.id, entityType: 'subtask' as const })),
  ]

  await db.transaction('rw', db.sections, db.tasks, db.subtasks, async () => {
    for (const task of tasks) {
      await db.subtasks.where('taskId').equals(task.id).delete()
    }
    await db.tasks.where('sectionId').equals(id).delete()
    await db.sections.delete(id)
  })
  await recordTombstones(tombstoneItems)
}
