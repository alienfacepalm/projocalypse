import { normalizeImportedDevelopers, sliceExportForProject } from '@/lib/embed'
import { db } from '@/db/schema'
import { enforceTombstones, mergeTombstoneLists } from '@/db/tombstones'
import {
  resumeDevMirrorAutoBackup,
  suspendDevMirrorAutoBackup,
} from '@/lib/dev-mirror-guard'
import { resolveRolePermissions } from '@/lib/permissions'
import type {
  Developer,
  DeveloperPermissions,
  DeveloperRole,
  ExportData,
  Priority,
  Project,
  Section,
  Subtask,
  Task,
  Tombstone,
} from '@/models/types'

export const EXPORT_DATA_VERSION = 2 as const

export async function exportProjectData(projectId: string): Promise<ExportData> {
  const full = await exportData()
  return sliceExportForProject(full, projectId)
}

export async function exportData(): Promise<ExportData> {
  const [projects, sections, tasks, subtasks, developers] = await Promise.all([
    db.projects.toArray(),
    db.sections.toArray(),
    db.tasks.toArray(),
    db.subtasks.toArray(),
    db.developers.toArray(),
  ])

  return {
    version: EXPORT_DATA_VERSION,
    exportedAt: Date.now(),
    projects,
    sections,
    tasks,
    subtasks,
    developers,
  }
}

const PRIORITIES = new Set<Priority>(['none', 'low', 'medium', 'high'])
const DEVELOPER_ROLES = new Set<DeveloperRole>(['master', 'lead', 'developer'])

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

function parsePermissions(raw: unknown, index: number, role: DeveloperRole): DeveloperPermissions {
  if (!isObject(raw)) {
    return resolveRolePermissions(role)
  }
  const readFlag = (key: keyof DeveloperPermissions) => {
    const value = raw[key]
    if (typeof value !== 'boolean') {
      throw new Error(`Invalid backup — developers[${index}].permissions.${key} must be true or false.`)
    }
    return value
  }
  return resolveRolePermissions(role, {
    manageDevelopers: readFlag('manageDevelopers'),
    assignTasks: readFlag('assignTasks'),
    manageProjects: readFlag('manageProjects'),
  })
}

function parseDeveloper(raw: unknown, index: number, fallbackProjectId?: string): Developer {
  if (!isObject(raw)) throw new Error(`Invalid backup — developers[${index}] must be an object.`)
  const roleRaw = raw.role
  const role: DeveloperRole =
    typeof roleRaw === 'string' && DEVELOPER_ROLES.has(roleRaw as DeveloperRole)
      ? (roleRaw as DeveloperRole)
      : 'developer'
  const permissions = parsePermissions(raw.permissions, index, role)
  const projectIdRaw = raw.projectId
  const projectId =
    typeof projectIdRaw === 'string' && projectIdRaw.trim()
      ? projectIdRaw
      : fallbackProjectId ??
        (() => {
          throw new Error(`Invalid backup — developers[${index}].projectId must be a non-empty string.`)
        })()
  return {
    id: requireString(raw, 'id', `developers[${index}].id`),
    projectId,
    name: requireString(raw, 'name', `developers[${index}].name`),
    color: requireString(raw, 'color', `developers[${index}].color`),
    initials:
      raw.initials === null || raw.initials === undefined
        ? null
        : typeof raw.initials === 'string'
          ? raw.initials
          : (() => {
              throw new Error(`Invalid backup — developers[${index}].initials must be a string or null.`)
            })(),
    role,
    permissions,
    sortOrder: requireNumber(raw, 'sortOrder', `developers[${index}].sortOrder`),
    createdAt: requireNumber(raw, 'createdAt', `developers[${index}].createdAt`),
    updatedAt: requireNumber(raw, 'updatedAt', `developers[${index}].updatedAt`),
  }
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
  const assigneeRaw = raw.assigneeId
  let assigneeId: string | null = null
  if (assigneeRaw !== undefined && assigneeRaw !== null) {
    if (typeof assigneeRaw !== 'string' || assigneeRaw.trim() === '') {
      throw new Error(`Invalid backup — tasks[${index}].assigneeId must be a string or null.`)
    }
    assigneeId = assigneeRaw
  }
  const createdAt = requireNumber(raw, 'createdAt', `tasks[${index}].createdAt`)
  const updatedAtRaw = raw.updatedAt
  const updatedAt =
    typeof updatedAtRaw === 'number' && !Number.isNaN(updatedAtRaw) ? updatedAtRaw : createdAt
  return {
    id: requireString(raw, 'id', `tasks[${index}].id`),
    projectId: requireString(raw, 'projectId', `tasks[${index}].projectId`),
    sectionId: requireString(raw, 'sectionId', `tasks[${index}].sectionId`),
    planItemId:
      raw.planItemId === null || raw.planItemId === undefined
        ? null
        : requireString(raw, 'planItemId', `tasks[${index}].planItemId`),
    title: requireString(raw, 'title', `tasks[${index}].title`),
    description: typeof raw.description === 'string' ? raw.description : '',
    completed: requireBoolean(raw, 'completed', `tasks[${index}].completed`),
    dueDate: dueDate as number | null,
    priority: priority as Priority,
    assigneeId,
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

  const version = data.version
  if (version !== 1 && version !== 2) {
    throw new Error(`Unsupported backup version (${String(version)}). Supported versions: 1, 2.`)
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

  const projects = (data.projects as unknown[]).map(parseProject)
  const fallbackProjectId = projects[0]?.id

  const developersRaw = data.developers
  let developers: Developer[] | undefined
  if (version === 2) {
    if (!Array.isArray(developersRaw)) {
      throw new Error('Invalid backup — "developers" must be an array for version 2.')
    }
    developers = developersRaw.map((item, index) => parseDeveloper(item, index, fallbackProjectId))
  } else if (developersRaw !== undefined) {
    if (!Array.isArray(developersRaw)) {
      throw new Error('Invalid backup — "developers" must be an array when present.')
    }
    developers = developersRaw.map((item, index) => parseDeveloper(item, index, fallbackProjectId))
  }

  const sections = (data.sections as unknown[]).map(parseSection)
  const tasks = (data.tasks as unknown[]).map(parseTask)
  const subtasks = (data.subtasks as unknown[]).map(parseSubtask)
  const normalizedDevelopers =
    developers && developers.length > 0 && fallbackProjectId
      ? normalizeImportedDevelopers(developers, fallbackProjectId)
      : developers

  return {
    version: version as 1 | 2,
    exportedAt,
    projects,
    sections,
    tasks,
    subtasks,
    developers: normalizedDevelopers,
  }
}

export async function importData(data: ExportData): Promise<void> {
  const validated = validateExportData(data)
  suspendDevMirrorAutoBackup()
  try {
    await db.tombstones.clear()

    await db.transaction('rw', [db.projects, db.sections, db.tasks, db.subtasks, db.developers], async () => {
      await db.subtasks.clear()
      await db.tasks.clear()
      await db.sections.clear()
      await db.projects.clear()
      await db.developers.clear()

      await db.projects.bulkAdd(validated.projects)
      await db.sections.bulkAdd(validated.sections)
      await db.tasks.bulkAdd(validated.tasks)
      await db.subtasks.bulkAdd(validated.subtasks)
      if (validated.developers?.length) {
        await db.developers.bulkAdd(validated.developers)
      }
    })
  } finally {
    resumeDevMirrorAutoBackup()
    if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
      void import('@/lib/dev-mirror').then((mod) => mod.scheduleDevMirrorPush())
    }
  }
}

/** Replace only the given projects (and their sections/tasks/subtasks); keep other projects intact. */
export async function importProjectsFromBundle(data: ExportData, projectIds: string[]): Promise<void> {
  validateExportData(data)
  const idSet = new Set(projectIds)
  const bundleProjects = data.projects.filter((p) => idSet.has(p.id))
  if (bundleProjects.length === 0) {
    throw new Error('Import bundle has no matching projects.')
  }

  const bundleProjectIds = new Set(bundleProjects.map((p) => p.id))
  const bundleSections = data.sections.filter((s) => bundleProjectIds.has(s.projectId))
  const bundleTasks = data.tasks.filter((t) => bundleProjectIds.has(t.projectId))
  const taskIds = new Set(bundleTasks.map((t) => t.id))
  const bundleSubtasks = data.subtasks.filter((s) => taskIds.has(s.taskId))

  await db.transaction('rw', db.projects, db.sections, db.tasks, db.subtasks, async () => {
    const existingTasks = await db.tasks.where('projectId').anyOf([...bundleProjectIds]).toArray()
    const existingTaskIds = existingTasks.map((t) => t.id)
    if (existingTaskIds.length > 0) {
      await db.subtasks.where('taskId').anyOf(existingTaskIds).delete()
    }
    await db.tasks.where('projectId').anyOf([...bundleProjectIds]).delete()
    await db.sections.where('projectId').anyOf([...bundleProjectIds]).delete()
    await db.projects.bulkDelete([...bundleProjectIds])

    await db.projects.bulkAdd(bundleProjects)
    if (bundleSections.length > 0) await db.sections.bulkAdd(bundleSections)
    if (bundleTasks.length > 0) await db.tasks.bulkAdd(bundleTasks)
    if (bundleSubtasks.length > 0) await db.subtasks.bulkAdd(bundleSubtasks)
  })
}

export async function importSyncData(data: ExportData, tombstones: Tombstone[]): Promise<void> {
  await importData(data)
  const uniqueTombstones = mergeTombstoneLists(tombstones, [])

  await db.transaction('rw', db.tombstones, async () => {
    await db.tombstones.clear()
    if (uniqueTombstones.length > 0) {
      await db.tombstones.bulkPut(uniqueTombstones)
    }
  })

  await enforceTombstones()
}

/** Normalize legacy developer records when reading from DB in tests. */
export function normalizeDeveloperPermissions(developer: Developer): Developer {
  const role = developer.role ?? 'developer'
  if (!developer.permissions) {
    return {
      ...developer,
      role,
      permissions: resolveRolePermissions(role),
    }
  }
  return {
    ...developer,
    role,
    permissions: resolveRolePermissions(role, role === 'developer' ? developer.permissions : undefined),
  }
}
