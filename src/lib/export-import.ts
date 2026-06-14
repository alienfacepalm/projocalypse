import { db } from '@/db/schema'
import { enforceTombstones, mergeTombstoneLists } from '@/db/tombstones'
import type { ExportData, Priority, Project, Section, Subtask, Task, Tombstone } from '@/models/types'

export async function exportData(): Promise<ExportData> {
  const [projects, sections, tasks, subtasks] = await Promise.all([
    db.projects.toArray(),
    db.sections.toArray(),
    db.tasks.toArray(),
    db.subtasks.toArray(),
  ])

  return {
    version: 1,
    exportedAt: Date.now(),
    projects,
    sections,
    tasks,
    subtasks,
  }
}

const PRIORITIES = new Set<Priority>(['none', 'low', 'medium', 'high'])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(obj: Record<string, unknown>, key: string, label: string): string {
  const value = obj[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid backup — ${label} must be a non-empty string.`)
  }
  return value
}

function requireNumber(obj: Record<string, unknown>, key: string, label: string): number {
  const value = obj[key]
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid backup — ${label} must be a number.`)
  }
  return value
}

function requireBoolean(obj: Record<string, unknown>, key: string, label: string): boolean {
  const value = obj[key]
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid backup — ${label} must be true or false.`)
  }
  return value
}

function parseProject(raw: unknown, index: number): Project {
  if (!isObject(raw)) throw new Error(`Invalid backup — projects[${index}] must be an object.`)
  return {
    id: requireString(raw, 'id', `projects[${index}].id`),
    name: requireString(raw, 'name', `projects[${index}].name`),
    color: requireString(raw, 'color', `projects[${index}].color`),
    archived: requireBoolean(raw, 'archived', `projects[${index}].archived`),
    sortOrder: requireNumber(raw, 'sortOrder', `projects[${index}].sortOrder`),
    createdAt: requireNumber(raw, 'createdAt', `projects[${index}].createdAt`),
    updatedAt: requireNumber(raw, 'updatedAt', `projects[${index}].updatedAt`),
  }
}

function parseSection(raw: unknown, index: number): Section {
  if (!isObject(raw)) throw new Error(`Invalid backup — sections[${index}] must be an object.`)
  const now = Date.now()
  const updatedAtRaw = raw.updatedAt
  const updatedAt =
    typeof updatedAtRaw === 'number' && !Number.isNaN(updatedAtRaw) ? updatedAtRaw : now
  return {
    id: requireString(raw, 'id', `sections[${index}].id`),
    projectId: requireString(raw, 'projectId', `sections[${index}].projectId`),
    name: requireString(raw, 'name', `sections[${index}].name`),
    sortOrder: requireNumber(raw, 'sortOrder', `sections[${index}].sortOrder`),
    updatedAt,
  }
}

function parseTask(raw: unknown, index: number): Task {
  if (!isObject(raw)) throw new Error(`Invalid backup — tasks[${index}] must be an object.`)
  const priority = raw.priority
  if (typeof priority !== 'string' || !PRIORITIES.has(priority as Priority)) {
    throw new Error(`Invalid backup — tasks[${index}].priority is invalid.`)
  }
  const dueDate = raw.dueDate
  if (dueDate !== null && (typeof dueDate !== 'number' || Number.isNaN(dueDate))) {
    throw new Error(`Invalid backup — tasks[${index}].dueDate must be a number or null.`)
  }
  const completedAt = raw.completedAt
  if (completedAt !== null && (typeof completedAt !== 'number' || Number.isNaN(completedAt))) {
    throw new Error(`Invalid backup — tasks[${index}].completedAt must be a number or null.`)
  }
  const createdAt = requireNumber(raw, 'createdAt', `tasks[${index}].createdAt`)
  const updatedAtRaw = raw.updatedAt
  const updatedAt =
    typeof updatedAtRaw === 'number' && !Number.isNaN(updatedAtRaw) ? updatedAtRaw : createdAt
  return {
    id: requireString(raw, 'id', `tasks[${index}].id`),
    projectId: requireString(raw, 'projectId', `tasks[${index}].projectId`),
    sectionId: requireString(raw, 'sectionId', `tasks[${index}].sectionId`),
    title: requireString(raw, 'title', `tasks[${index}].title`),
    description: typeof raw.description === 'string' ? raw.description : '',
    completed: requireBoolean(raw, 'completed', `tasks[${index}].completed`),
    dueDate: dueDate as number | null,
    priority: priority as Priority,
    sortOrder: requireNumber(raw, 'sortOrder', `tasks[${index}].sortOrder`),
    createdAt,
    updatedAt,
    completedAt: completedAt as number | null,
  }
}

function parseSubtask(raw: unknown, index: number): Subtask {
  if (!isObject(raw)) throw new Error(`Invalid backup — subtasks[${index}] must be an object.`)
  const updatedAtRaw = raw.updatedAt
  const updatedAt =
    typeof updatedAtRaw === 'number' && !Number.isNaN(updatedAtRaw) ? updatedAtRaw : Date.now()
  return {
    id: requireString(raw, 'id', `subtasks[${index}].id`),
    taskId: requireString(raw, 'taskId', `subtasks[${index}].taskId`),
    title: requireString(raw, 'title', `subtasks[${index}].title`),
    completed: requireBoolean(raw, 'completed', `subtasks[${index}].completed`),
    sortOrder: requireNumber(raw, 'sortOrder', `subtasks[${index}].sortOrder`),
    updatedAt,
  }
}

export function parseImportJson(text: string): ExportData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON — the file could not be parsed.')
  }
  return validateExportData(parsed)
}

export function validateExportData(data: unknown): ExportData {
  if (!isObject(data)) {
    throw new Error('Invalid backup — expected a JSON object at the top level.')
  }

  if (data.version !== 1) {
    throw new Error(`Unsupported backup version (${String(data.version)}). Only version 1 is supported.`)
  }

  for (const key of ['projects', 'sections', 'tasks', 'subtasks'] as const) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Invalid backup — "${key}" must be an array.`)
    }
  }

  const exportedAt = data.exportedAt
  if (typeof exportedAt !== 'number' || Number.isNaN(exportedAt)) {
    throw new Error('Invalid backup — "exportedAt" must be a number.')
  }

  return {
    version: 1,
    exportedAt,
    projects: (data.projects as unknown[]).map(parseProject),
    sections: (data.sections as unknown[]).map(parseSection),
    tasks: (data.tasks as unknown[]).map(parseTask),
    subtasks: (data.subtasks as unknown[]).map(parseSubtask),
  }
}

export async function importData(data: ExportData): Promise<void> {
  validateExportData(data)
  await db.tombstones.clear()

  await db.transaction('rw', db.projects, db.sections, db.tasks, db.subtasks, async () => {
    await db.subtasks.clear()
    await db.tasks.clear()
    await db.sections.clear()
    await db.projects.clear()

    await db.projects.bulkAdd(data.projects)
    await db.sections.bulkAdd(data.sections)
    await db.tasks.bulkAdd(data.tasks)
    await db.subtasks.bulkAdd(data.subtasks)
  })
}

export async function importSyncData(data: ExportData, tombstones: Tombstone[]): Promise<void> {
  validateExportData(data)
  const uniqueTombstones = mergeTombstoneLists(tombstones, [])

  await db.transaction('rw', db.projects, db.sections, db.tasks, db.subtasks, async () => {
    await db.subtasks.clear()
    await db.tasks.clear()
    await db.sections.clear()
    await db.projects.clear()

    await db.projects.bulkAdd(data.projects)
    await db.sections.bulkAdd(data.sections)
    await db.tasks.bulkAdd(data.tasks)
    await db.subtasks.bulkAdd(data.subtasks)
  })

  await db.transaction('rw', db.tombstones, async () => {
    await db.tombstones.clear()
    if (uniqueTombstones.length > 0) {
      await db.tombstones.bulkPut(uniqueTombstones)
    }
  })

  await enforceTombstones()
}
