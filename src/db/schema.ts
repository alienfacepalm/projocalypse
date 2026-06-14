import Dexie, { type Table } from 'dexie'
import type { Project, Section, Subtask, Task, Tombstone } from '@/models/types'

export interface SyncMeta {
  id: 'sync'
  fileLinked: boolean
  fileHandle?: FileSystemFileHandle
}

export class PMDatabase extends Dexie {
  projects!: Table<Project>
  sections!: Table<Section>
  tasks!: Table<Task>
  subtasks!: Table<Subtask>
  tombstones!: Table<Tombstone>
  syncMeta!: Table<SyncMeta>

  constructor() {
    super('pm-tool')
    this.version(1).stores({
      projects: 'id, sortOrder, archived',
      sections: 'id, projectId, sortOrder',
      tasks: 'id, projectId, sectionId, completed, dueDate, sortOrder',
      subtasks: 'id, taskId, sortOrder',
    })
    this.version(2)
      .stores({
        projects: 'id, sortOrder, archived, updatedAt',
        sections: 'id, projectId, sortOrder, updatedAt',
        tasks: 'id, projectId, sectionId, completed, dueDate, sortOrder, updatedAt',
        subtasks: 'id, taskId, sortOrder, updatedAt',
        syncMeta: 'id',
      })
      .upgrade(async (tx) => {
        const now = Date.now()
        await tx
          .table('sections')
          .toCollection()
          .modify((section: Section) => {
            if (typeof section.updatedAt !== 'number') {
              section.updatedAt = now
            }
          })
        await tx
          .table('tasks')
          .toCollection()
          .modify((task: Task) => {
            if (typeof task.updatedAt !== 'number') {
              task.updatedAt = task.createdAt ?? now
            }
          })
        await tx
          .table('subtasks')
          .toCollection()
          .modify((subtask: Subtask) => {
            if (typeof subtask.updatedAt !== 'number') {
              subtask.updatedAt = now
            }
          })
      })
    this.version(3).stores({
      projects: 'id, sortOrder, archived, updatedAt',
      sections: 'id, projectId, sortOrder, updatedAt',
      tasks: 'id, projectId, sectionId, completed, dueDate, sortOrder, updatedAt',
      subtasks: 'id, taskId, sortOrder, updatedAt',
      tombstones: 'id, entityType, deletedAt',
      syncMeta: 'id',
    })
  }
}

export const db = new PMDatabase()
