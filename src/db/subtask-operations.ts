import { v4 as uuidv4 } from 'uuid'
import { recordTombstone } from '@/db/tombstones'
import { db } from '@/db/schema'
import type { Subtask } from '@/models/types'

export async function createSubtask(taskId: string, title: string): Promise<Subtask> {
  const now = Date.now()
  const count = await db.subtasks.where('taskId').equals(taskId).count()
  const subtask: Subtask = { id: uuidv4(), taskId, title, completed: false, sortOrder: count, updatedAt: now }
  await db.subtasks.add(subtask)
  return subtask
}

export async function updateSubtask(id: string, updates: Partial<Pick<Subtask, 'title' | 'completed'>>): Promise<void> {
  await db.subtasks.update(id, { ...updates, updatedAt: Date.now() })
}

export async function deleteSubtask(id: string): Promise<void> {
  await db.subtasks.delete(id)
  await recordTombstone(id, 'subtask')
}
