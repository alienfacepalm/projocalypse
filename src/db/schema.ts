import Dexie, { type Table } from 'dexie'
import type { Project, Section, Subtask, Task } from '@/models/types'

export class PMDatabase extends Dexie {
  projects!: Table<Project>
  sections!: Table<Section>
  tasks!: Table<Task>
  subtasks!: Table<Subtask>

  constructor() {
    super('pm-tool')
    this.version(1).stores({
      projects: 'id, sortOrder, archived',
      sections: 'id, projectId, sortOrder',
      tasks: 'id, projectId, sectionId, completed, dueDate, sortOrder',
      subtasks: 'id, taskId, sortOrder',
    })
  }
}

export const db = new PMDatabase()
