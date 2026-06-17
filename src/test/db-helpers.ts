import { db, resetDatabaseInstanceForTests } from '@/db/schema'
import { createProject, bootstrapMasterDeveloper } from '@/db/operations'
import { LEAD_PERMISSIONS, MASTER_PERMISSIONS } from '@/lib/permissions'
import type { Developer, ExportData, Project, Section, Subtask, Task } from '@/models/types'

export async function clearDb(): Promise<void> {
  db.close()
  await db.delete()
  resetDatabaseInstanceForTests()
  db.open()
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
  const now = Date.now()
  return {
    id: 'section-1',
    projectId: 'project-1',
    name: 'To Do',
    sortOrder: 0,
    updatedAt: now,
    ...overrides,
  }
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  const now = Date.now()
  return {
    id: 'task-1',
    projectId: 'project-1',
    sectionId: 'section-1',
    planItemId: null,
    title: 'Test task',
    description: '',
    completed: false,
    dueDate: null,
    priority: 'none',
    assigneeId: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    ...overrides,
  }
}

export function makeSubtask(overrides: Partial<Subtask> = {}): Subtask {
  const now = Date.now()
  return {
    id: 'subtask-1',
    taskId: 'task-1',
    title: 'Subtask',
    completed: false,
    sortOrder: 0,
    updatedAt: now,
    ...overrides,
  }
}

export function makeDeveloper(overrides: Partial<Developer> = {}): Developer {
  const now = Date.now()
  const role = overrides.role ?? 'developer'
  return {
    id: 'dev-1',
    projectId: 'project-1',
    name: 'Alex Dev',
    color: '#4573D2',
    initials: null,
    role,
    permissions:
      role === 'master'
        ? MASTER_PERMISSIONS
        : role === 'lead'
          ? LEAD_PERMISSIONS
          : {
              manageDevelopers: false,
              assignTasks: true,
              manageProjects: false,
            },
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function makeMasterDeveloper(overrides: Partial<Developer> = {}): Developer {
  return makeDeveloper({ role: 'master', ...overrides })
}

export function makeLeadDeveloper(overrides: Partial<Developer> = {}): Developer {
  return makeDeveloper({ role: 'lead', ...overrides })
}

export async function seedTestProjectAndMaster(
  name = 'Test Master',
): Promise<{ actor: Developer; projectId: string }> {
  const project = await createProject('Seed', '#4573D2')
  const actor = await bootstrapMasterDeveloper(project.id, name)
  return { actor, projectId: project.id }
}

export async function seedTestMaster(projectId: string, name = 'Test Master'): Promise<Developer> {
  return bootstrapMasterDeveloper(projectId, name)
}

export function makeExportData(overrides: Partial<ExportData> = {}): ExportData {
  const project = makeProject()
  const section = makeSection()
  const task = makeTask()
  const subtask = makeSubtask()
  const developer = makeDeveloper()
  return {
    version: 2,
    exportedAt: Date.now(),
    projects: [project],
    sections: [section],
    tasks: [task],
    subtasks: [subtask],
    developers: [developer],
    ...overrides,
  }
}
