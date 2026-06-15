import Dexie, { type Table } from 'dexie'
import type { Developer, Project, Section, Subtask, Task, Tombstone } from '@/models/types'
import { DEFAULT_DEVELOPER_PERMISSIONS, MASTER_PERMISSIONS } from '@/lib/permissions'

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
  developers!: Table<Developer>
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
    this.version(4)
      .stores({
        projects: 'id, sortOrder, archived, updatedAt',
        sections: 'id, projectId, sortOrder, updatedAt',
        tasks: 'id, projectId, sectionId, completed, dueDate, assigneeId, sortOrder, updatedAt',
        subtasks: 'id, taskId, sortOrder, updatedAt',
        developers: 'id, sortOrder, updatedAt',
        tombstones: 'id, entityType, deletedAt',
        syncMeta: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('tasks')
          .toCollection()
          .modify((task: Task) => {
            if (task.assigneeId === undefined) {
              task.assigneeId = null
            }
          })
      })
    this.version(5)
      .stores({
        projects: 'id, sortOrder, archived, updatedAt',
        sections: 'id, projectId, sortOrder, updatedAt',
        tasks: 'id, projectId, sectionId, completed, dueDate, assigneeId, sortOrder, updatedAt',
        subtasks: 'id, taskId, sortOrder, updatedAt',
        developers: 'id, role, sortOrder, updatedAt',
        tombstones: 'id, entityType, deletedAt',
        syncMeta: 'id',
      })
      .upgrade(async (tx) => {
        const developers = (await tx.table('developers').toArray()) as Developer[]
        let masterCount = 0

        for (const developer of developers) {
          const patch: Partial<Developer> = {}
          if (!developer.role) {
            patch.role = 'developer'
          }
          if (!developer.permissions) {
            patch.permissions =
              developer.role === 'master' ? MASTER_PERMISSIONS : DEFAULT_DEVELOPER_PERMISSIONS
          }
          if (Object.keys(patch).length > 0) {
            await tx.table('developers').update(developer.id, patch)
          }
          if ((patch.role ?? developer.role) === 'master') {
            masterCount += 1
          }
        }

        if (developers.length > 0 && masterCount === 0) {
          const first = developers[0]!
          await tx.table('developers').update(first.id, {
            role: 'master',
            permissions: MASTER_PERMISSIONS,
          })
        }
      })
    this.version(6)
      .stores({
        projects: 'id, sortOrder, archived, updatedAt',
        sections: 'id, projectId, sortOrder, updatedAt',
        tasks: 'id, projectId, sectionId, completed, dueDate, assigneeId, sortOrder, updatedAt',
        subtasks: 'id, taskId, sortOrder, updatedAt',
        developers: 'id, projectId, role, sortOrder, updatedAt',
        tombstones: 'id, entityType, deletedAt',
        syncMeta: 'id',
      })
      .upgrade(async (tx) => {
        const projects = await tx.table('projects').orderBy('sortOrder').toArray()
        const fallbackProjectId = projects[0]?.id as string | undefined

        await tx.table('developers').toCollection().modify((developer: Developer & { projectId?: string }) => {
          if (!developer.projectId && fallbackProjectId) {
            developer.projectId = fallbackProjectId
          }
        })
      })
  }
}

export const db = new PMDatabase()
