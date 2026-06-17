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

/** master — full roster & project control; lead — add developers; developer — day-to-day task work */
export type DeveloperRole = 'master' | 'lead' | 'developer'

export interface DeveloperPermissions {
  /** Create, edit, remove developers and change permissions. */
  manageDevelopers: boolean
  /** Assign tasks to any developer. */
  assignTasks: boolean
  /** Create and delete projects. */
  manageProjects: boolean
}

export interface Developer {
  id: string
  /** Project this developer belongs to (per-project roster). */
  projectId: string
  name: string
  /** Badge color; defaults from palette when created. */
  color: string
  /** Optional override for avatar initials (1–3 chars). */
  initials: string | null
  role: DeveloperRole
  permissions: DeveloperPermissions
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export interface Task {
  id: string
  projectId: string
  sectionId: string
  /** Stable id from host plan markdown (pm:PM-001). */
  planItemId: string | null
  title: string
  description: string
  completed: boolean
  dueDate: number | null
  priority: Priority
  assigneeId: string | null
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
  version: 1 | 2 | 3
  syncedAt: number
  projects: Project[]
  sections: Section[]
  tasks: Task[]
  subtasks: Subtask[]
  /** v2+: propagates deletes across devices */
  tombstones?: Tombstone[]
  /** v3+: team members for task assignment */
  developers?: Developer[]
}

export type ViewMode = 'list' | 'board'

export interface ExportData {
  version: 1 | 2
  exportedAt: number
  projects: Project[]
  sections: Section[]
  tasks: Task[]
  subtasks: Subtask[]
  /** v2+: developers referenced by task assigneeId */
  developers?: Developer[]
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
