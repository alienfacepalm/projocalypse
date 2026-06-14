export type Priority = 'none' | 'low' | 'medium' | 'high'

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
  completedAt: number | null
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  completed: boolean
  sortOrder: number
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
