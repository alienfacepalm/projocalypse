import { v4 as uuidv4 } from 'uuid'
import { db } from '@/db/schema'
import type { Priority, Project, Section, Subtask, Task } from '@/models/types'

export async function createProject(name: string, color: string): Promise<Project> {
  const now = Date.now()
  const count = await db.projects.filter((p) => !p.archived).count()
  const project: Project = {
    id: uuidv4(),
    name,
    color,
    archived: false,
    sortOrder: count,
    createdAt: now,
    updatedAt: now,
  }

  const todoSectionId = uuidv4()
  const inProgressSectionId = uuidv4()
  const doneSectionId = uuidv4()
  await db.transaction('rw', db.projects, db.sections, async () => {
    await db.projects.add(project)
    await db.sections.bulkAdd([
      { id: todoSectionId, projectId: project.id, name: 'To Do', sortOrder: 0, updatedAt: now },
      { id: inProgressSectionId, projectId: project.id, name: 'In Progress', sortOrder: 1, updatedAt: now },
      { id: doneSectionId, projectId: project.id, name: 'Done', sortOrder: 2, updatedAt: now },
    ])
  })

  return project
}

export async function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'color' | 'archived'>>): Promise<void> {
  await db.projects.update(id, { ...updates, updatedAt: Date.now() })
}

export async function createSection(projectId: string, name: string): Promise<Section> {
  const now = Date.now()
  const count = await db.sections.where('projectId').equals(projectId).count()
  const section: Section = { id: uuidv4(), projectId, name, sortOrder: count, updatedAt: now }
  await db.sections.add(section)
  return section
}

export async function updateSection(id: string, name: string): Promise<void> {
  await db.sections.update(id, { name, updatedAt: Date.now() })
}

export async function deleteSection(id: string): Promise<void> {
  await db.transaction('rw', db.sections, db.tasks, async () => {
    await db.tasks.where('sectionId').equals(id).delete()
    await db.sections.delete(id)
  })
}

export async function createTask(projectId: string, sectionId: string, title: string): Promise<Task> {
  const count = await db.tasks.where('sectionId').equals(sectionId).count()
  const now = Date.now()
  const task: Task = {
    id: uuidv4(),
    projectId,
    sectionId,
    title,
    description: '',
    completed: false,
    dueDate: null,
    priority: 'none',
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
  updates: Partial<Pick<Task, 'title' | 'description' | 'dueDate' | 'priority' | 'sectionId' | 'sortOrder' | 'completed' | 'completedAt'>>,
): Promise<void> {
  await db.tasks.update(id, { ...updates, updatedAt: Date.now() })
}

export async function toggleTaskComplete(task: Task): Promise<void> {
  const completed = !task.completed
  const now = Date.now()
  await db.tasks.update(task.id, {
    completed,
    completedAt: completed ? now : null,
    updatedAt: now,
  })
}

export async function deleteTask(id: string): Promise<void> {
  await db.transaction('rw', db.tasks, db.subtasks, async () => {
    await db.subtasks.where('taskId').equals(id).delete()
    await db.tasks.delete(id)
  })
}

export async function moveTask(taskId: string, sectionId: string, sortOrder: number): Promise<void> {
  await db.tasks.update(taskId, { sectionId, sortOrder, updatedAt: Date.now() })
}

export async function reorderTasks(updates: { id: string; sectionId: string; sortOrder: number }[]): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.tasks, async () => {
    for (const u of updates) {
      await db.tasks.update(u.id, { sectionId: u.sectionId, sortOrder: u.sortOrder, updatedAt: now })
    }
  })
}

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
}

export async function setTaskPriority(id: string, priority: Priority): Promise<void> {
  await db.tasks.update(id, { priority, updatedAt: Date.now() })
}

export async function archiveProject(id: string): Promise<void> {
  await updateProject(id, { archived: true })
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', db.projects, db.sections, db.tasks, db.subtasks, async () => {
    const tasks = await db.tasks.where('projectId').equals(id).toArray()
    for (const task of tasks) {
      await db.subtasks.where('taskId').equals(task.id).delete()
    }
    await db.tasks.where('projectId').equals(id).delete()
    await db.sections.where('projectId').equals(id).delete()
    await db.projects.delete(id)
  })
}

const GETTING_STARTED_NAME = 'Getting Started'

/** Removes legacy demo projects seeded in earlier versions. */
export async function removeGettingStartedProjects(): Promise<void> {
  const projects = await db.projects.filter((p) => p.name === GETTING_STARTED_NAME).toArray()
  for (const project of projects) {
    await deleteProject(project.id)
  }
}
