export type Priority = 'none' | 'low' | 'medium' | 'high'

export type TombstoneEntityType = 'project' | 'section' | 'task' | 'subtask'

/** Records a delete for cross-device sync (deletedAt wins over stale entities). */
export interface Tombstone {
  id: string
  entityType: TombstoneEntityType
  deletedAt: number
}

export interface Project {
  id: string
  name: string
  color: string
  archived: boolean
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export interface Section {
  id: string
  projectId: string
  name: string
  sortOrder: number
  updatedAt: number
}

export interface Task {
  id: string
  projectId: string
  sectionId: string
  title: string
  description: string
  completed: boolean
  dueDate: number | null
  priority: Priority
  sortOrder: number
  createdAt: number
  updatedAt: number
  completedAt: number | null
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  completed: boolean
  sortOrder: number
  updatedAt: number
}

/** Payload synced across browsers (Tabocalypse-style sync slice). */
export interface SyncSlice {
  version: 1 | 2
  syncedAt: number
  projects: Project[]
  sections: Section[]
  tasks: Task[]
  subtasks: Subtask[]
  /** v2+: propagates deletes across devices */
  tombstones?: Tombstone[]
}

export type ViewMode = 'list' | 'board'

export interface ExportData {
  version: 1
  exportedAt: number
  projects: Project[]
  sections: Section[]
  tasks: Task[]
  subtasks: Subtask[]
}

export const PROJECT_COLORS = [
  '#F06A6A',
  '#F1BD6C',
  '#5DA283',
  '#4573D2',
  '#9CA6D9',
  '#B36BCE',
  '#F26FB2',
  '#FF8787',
] as const
