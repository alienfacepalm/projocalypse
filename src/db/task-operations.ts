import { v4 as uuidv4 } from 'uuid'
import { recordTombstones } from '@/db/tombstones'
import { requirePermission } from '@/db/operations-helpers'
import { db } from '@/db/schema'
import {
  completionUpdatesForSectionMove,
  sectionIdForCompletionToggle,
} from '@/lib/section-workflow'
import type { Developer, Priority, Task } from '@/models/types'

export async function createTask(projectId: string, sectionId: string, title: string): Promise<Task> {
  const count = await db.tasks.where('sectionId').equals(sectionId).count()
  const now = Date.now()
  const task: Task = {
    id: uuidv4(),
    projectId,
    sectionId,
    planItemId: null,
    title,
    description: '',
    completed: false,
    dueDate: null,
    priority: 'none',
    assigneeId: null,
    sortOrder: count,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  }
  await db.tasks.add(task)
  return task
}

export async function updateTask(
  id: string,
  updates: Partial<
    Pick<Task, 'title' | 'description' | 'dueDate' | 'priority' | 'sectionId' | 'sortOrder' | 'completed' | 'completedAt' | 'assigneeId' | 'planItemId'>
  >,
): Promise<void> {
  await db.tasks.update(id, { ...updates, updatedAt: Date.now() })
}

export async function toggleTaskComplete(task: Task): Promise<void> {
  const completed = !task.completed
  const now = Date.now()
  const updates: Partial<Pick<Task, 'completed' | 'completedAt' | 'sectionId' | 'sortOrder' | 'updatedAt'>> = {
    completed,
    completedAt: completed ? now : null,
    updatedAt: now,
  }

  const sections = await db.sections.where('projectId').equals(task.projectId).sortBy('sortOrder')
  const targetSectionId = sectionIdForCompletionToggle(task, sections, completed)
  if (targetSectionId) {
    const count = await db.tasks.where('sectionId').equals(targetSectionId).count()
    updates.sectionId = targetSectionId
    updates.sortOrder = count
  }

  await db.tasks.update(task.id, updates)
}

export async function deleteTask(id: string): Promise<void> {
  const subtasks = await db.subtasks.where('taskId').equals(id).toArray()
  await db.transaction('rw', db.tasks, db.subtasks, async () => {
    await db.subtasks.where('taskId').equals(id).delete()
    await db.tasks.delete(id)
  })
  await recordTombstones([
    { id, entityType: 'task' },
    ...subtasks.map((subtask) => ({ id: subtask.id, entityType: 'subtask' as const })),
  ])
}

export async function moveTask(taskId: string, sectionId: string, sortOrder: number): Promise<void> {
  const task = await db.tasks.get(taskId)
  if (!task) return

  const sections = await db.sections.where('projectId').equals(task.projectId).toArray()
  const sectionNameById = new Map(sections.map((section) => [section.id, section.name]))
  const workflowUpdates = completionUpdatesForSectionMove(
    task,
    sectionNameById.get(task.sectionId),
    sectionNameById.get(sectionId),
  )

  await db.tasks.update(taskId, {
    sectionId,
    sortOrder,
    ...workflowUpdates,
    updatedAt: Date.now(),
  })
}

export async function moveTaskToSection(taskId: string, sectionId: string): Promise<void> {
  const task = await db.tasks.get(taskId)
  if (!task || task.sectionId === sectionId) return

  const count = await db.tasks
    .where('sectionId')
    .equals(sectionId)
    .filter((item) => item.id !== taskId)
    .count()
  await moveTask(taskId, sectionId, count)
}

export async function reorderTasks(updates: { id: string; sectionId: string; sortOrder: number }[]): Promise<void> {
  if (updates.length === 0) return

  const firstTask = await db.tasks.get(updates[0]!.id)
  if (!firstTask) return

  const sections = await db.sections.where('projectId').equals(firstTask.projectId).toArray()
  const sectionNameById = new Map(sections.map((section) => [section.id, section.name]))
  const now = Date.now()

  await db.transaction('rw', db.tasks, async () => {
    for (const update of updates) {
      const task = await db.tasks.get(update.id)
      if (!task) continue

      const taskUpdates: Partial<Task> = {
        sectionId: update.sectionId,
        sortOrder: update.sortOrder,
        updatedAt: now,
      }

      if (update.sectionId !== task.sectionId) {
        const workflowUpdates = completionUpdatesForSectionMove(
          task,
          sectionNameById.get(task.sectionId),
          sectionNameById.get(update.sectionId),
          now,
        )
        if (workflowUpdates) {
          Object.assign(taskUpdates, workflowUpdates)
        }
      }

      await db.tasks.update(update.id, taskUpdates)
    }
  })
}

export async function applyBoardTaskUpdates(
  updates: {
    id: string
    sectionId: string
    sortOrder: number
    completed?: boolean
    completedAt?: number | null
  }[],
): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.tasks, async () => {
    for (const update of updates) {
      const patch: Partial<Task> = {
        sectionId: update.sectionId,
        sortOrder: update.sortOrder,
        updatedAt: now,
      }
      if (update.completed !== undefined) patch.completed = update.completed
      if (update.completedAt !== undefined) patch.completedAt = update.completedAt
      await db.tasks.update(update.id, patch)
    }
  })
}

export async function setTaskPriority(id: string, priority: Priority): Promise<void> {
  await db.tasks.update(id, { priority, updatedAt: Date.now() })
}

export async function setTaskAssignee(
  actor: Developer,
  id: string,
  assigneeId: string | null,
): Promise<void> {
  requirePermission(actor, 'assignTasks')
  const task = await db.tasks.get(id)
  if (!task) return

  if (assigneeId !== null) {
    const assignee = await db.developers.get(assigneeId)
    if (!assignee) {
      throw new Error('Assignee developer not found.')
    }
    if (assignee.projectId !== task.projectId) {
      throw new Error('Assignee must belong to the same project as the task.')
    }
  }
  await db.tasks.update(id, { assigneeId, updatedAt: Date.now() })
}
