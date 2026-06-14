import { db } from '@/db/schema'
import type { Tombstone, TombstoneEntityType } from '@/models/types'

export async function recordTombstone(id: string, entityType: TombstoneEntityType): Promise<void> {
  const deletedAt = Date.now()
  const existing = await db.tombstones.get(id)
  if (!existing || deletedAt > existing.deletedAt) {
    await db.tombstones.put({ id, entityType, deletedAt })
  }
}

export async function recordTombstones(items: { id: string; entityType: TombstoneEntityType }[]): Promise<void> {
  if (items.length === 0) return
  const deletedAt = Date.now()
  await db.transaction('rw', db.tombstones, async () => {
    for (const item of items) {
      const existing = await db.tombstones.get(item.id)
      if (!existing || deletedAt > existing.deletedAt) {
        await db.tombstones.put({ id: item.id, entityType: item.entityType, deletedAt })
      }
    }
  })
}

export async function getAllTombstones(): Promise<Tombstone[]> {
  return db.tombstones.toArray()
}

export function tombstoneMap(tombstones: Tombstone[]): Map<string, number> {
  return new Map(tombstones.map((t) => [t.id, t.deletedAt]))
}

export function filterByTombstones<T extends { id: string; updatedAt: number }>(
  entities: readonly T[],
  tombstones: Map<string, number>,
): T[] {
  return entities.filter((entity) => {
    const deletedAt = tombstones.get(entity.id)
    return deletedAt === undefined || entity.updatedAt > deletedAt
  })
}

export function mergeTombstoneLists(a: readonly Tombstone[], b: readonly Tombstone[]): Tombstone[] {
  const byId = new Map<string, Tombstone>()
  for (const tombstone of [...a, ...b]) {
    const existing = byId.get(tombstone.id)
    if (!existing || tombstone.deletedAt > existing.deletedAt) {
      byId.set(tombstone.id, tombstone)
    }
  }
  return [...byId.values()]
}

export async function enforceTombstones(): Promise<void> {
  const tombstones = await getAllTombstones()
  await db.transaction('rw', db.projects, db.sections, db.tasks, db.subtasks, async () => {
    for (const tombstone of tombstones) {
      switch (tombstone.entityType) {
        case 'subtask': {
          const entity = await db.subtasks.get(tombstone.id)
          if (entity && entity.updatedAt <= tombstone.deletedAt) await db.subtasks.delete(tombstone.id)
          break
        }
        case 'task': {
          const entity = await db.tasks.get(tombstone.id)
          if (entity && entity.updatedAt <= tombstone.deletedAt) {
            await db.subtasks.where('taskId').equals(tombstone.id).delete()
            await db.tasks.delete(tombstone.id)
          }
          break
        }
        case 'section': {
          const entity = await db.sections.get(tombstone.id)
          if (entity && entity.updatedAt <= tombstone.deletedAt) {
            await db.tasks.where('sectionId').equals(tombstone.id).delete()
            await db.sections.delete(tombstone.id)
          }
          break
        }
        case 'project': {
          const entity = await db.projects.get(tombstone.id)
          if (entity && entity.updatedAt <= tombstone.deletedAt) {
            const tasks = await db.tasks.where('projectId').equals(tombstone.id).toArray()
            for (const task of tasks) {
              await db.subtasks.where('taskId').equals(task.id).delete()
            }
            await db.tasks.where('projectId').equals(tombstone.id).delete()
            await db.sections.where('projectId').equals(tombstone.id).delete()
            await db.projects.delete(tombstone.id)
          }
          break
        }
      }
    }
  })
}
