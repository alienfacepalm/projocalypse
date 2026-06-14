import { db } from '@/db/schema'
import type { ExportData, Project, Section, Subtask, Task } from '@/models/types'

export async function clearDb(): Promise<void> {
  await db.transaction('rw', db.projects, db.sections, db.tasks, db.subtasks, async () => {
    await db.subtasks.clear()
    await db.tasks.clear()
    await db.sections.clear()
    await db.projects.clear()
  })
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  const now = Date.now()
  return {
    id: 'project-1',
    name: 'Test Project',
    color: '#4573D2',
    archived: false,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: 'section-1',
    projectId: 'project-1',
    name: 'To Do',
    sortOrder: 0,
    ...overrides,
  }
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  const now = Date.now()
  return {
    id: 'task-1',
    projectId: 'project-1',
    sectionId: 'section-1',
    title: 'Test task',
    description: '',
    completed: false,
    dueDate: null,
    priority: 'none',
    sortOrder: 0,
    createdAt: now,
    completedAt: null,
    ...overrides,
  }
}

export function makeSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: 'subtask-1',
    taskId: 'task-1',
    title: 'Subtask',
    completed: false,
    sortOrder: 0,
    ...overrides,
  }
}

export function makeExportData(overrides: Partial<ExportData> = {}): ExportData {
  const project = makeProject()
  const section = makeSection()
  const task = makeTask()
  const subtask = makeSubtask()
  return {
    version: 1,
    exportedAt: Date.now(),
    projects: [project],
    sections: [section],
    tasks: [task],
    subtasks: [subtask],
    ...overrides,
  }
}
