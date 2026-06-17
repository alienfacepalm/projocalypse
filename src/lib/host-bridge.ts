import { v4 as uuidv4 } from 'uuid'
import { db } from '@/db/schema'
import { createProject, findWorkspaceActor, updateTask } from '@/db/operations'
import type { PendingSync, PendingTaskUpsert } from '@projocalypse/core'
import { validatePendingSync } from '@projocalypse/core'
import type { Priority, Project, Section, Task } from '@/models/types'
import { PROJECT_COLORS } from '@/models/types'

export function hostLinkStorageKey(packageName: string, hostEntityId?: string | null): string {
  const entity = hostEntityId ?? 'default'
  return `projocalypse-host-link:${packageName}:${entity}`
}

export function readHostLinkProjectId(
  packageName: string,
  hostEntityId?: string | null,
): string | null {
  try {
    return localStorage.getItem(hostLinkStorageKey(packageName, hostEntityId))
  } catch {
    return null
  }
}

export function writeHostLinkProjectId(
  packageName: string,
  projectId: string,
  hostEntityId?: string | null,
): void {
  localStorage.setItem(hostLinkStorageKey(packageName, hostEntityId), projectId)
}

export async function ensureProjectSections(
  projectId: string,
  sectionNames: string[],
): Promise<Map<string, Section>> {
  const existing = await db.sections.where('projectId').equals(projectId).sortBy('sortOrder')
  const byName = new Map(existing.map((section) => [section.name.toLowerCase(), section]))
  const now = Date.now()

  for (let index = 0; index < sectionNames.length; index++) {
    const name = sectionNames[index]!
    const key = name.toLowerCase()
    if (!byName.has(key)) {
      const section: Section = {
        id: uuidv4(),
        projectId,
        name,
        sortOrder: index,
        updatedAt: now,
      }
      await db.sections.add(section)
      byName.set(key, section)
    }
  }

  const refreshed = await db.sections.where('projectId').equals(projectId).sortBy('sortOrder')
  return new Map(refreshed.map((section) => [section.name.toLowerCase(), section]))
}

export async function createHostProject(
  name: string,
  sectionNames: string[],
  color = PROJECT_COLORS[3],
): Promise<Project> {
  const actor = await findWorkspaceActor('manageProjects')
  const project = await createProject(name, color, actor ?? undefined)
  await db.transaction('rw', db.sections, async () => {
    const defaults = await db.sections.where('projectId').equals(project.id).toArray()
    for (const section of defaults) {
      await db.sections.delete(section.id)
    }
  })
  await ensureProjectSections(project.id, sectionNames)
  return project
}

async function findTaskByPlanItemId(projectId: string, planItemId: string): Promise<Task | undefined> {
  const tasks = await db.tasks.where('projectId').equals(projectId).toArray()
  return tasks.find((task) => task.planItemId === planItemId)
}

async function upsertPendingTask(
  projectId: string,
  sections: Map<string, Section>,
  upsert: PendingTaskUpsert,
  defaultSectionName: string,
): Promise<'created' | 'updated' | 'skipped'> {
  const sectionKey = (upsert.sectionName || defaultSectionName).toLowerCase()
  const section = sections.get(sectionKey) ?? sections.get(defaultSectionName.toLowerCase())
  if (!section) return 'skipped'

  const existing = await findTaskByPlanItemId(projectId, upsert.planItemId)
  const now = Date.now()

  if (existing) {
    await updateTask(existing.id, {
      title: upsert.title,
      description: upsert.description ?? existing.description,
      priority: upsert.priority as Priority,
      sectionId: section.id,
      completed: upsert.completed,
      completedAt: upsert.completed ? (existing.completedAt ?? now) : null,
      planItemId: upsert.planItemId,
    })
    return 'updated'
  }

  const count = await db.tasks.where('sectionId').equals(section.id).count()
  const task: Task = {
    id: uuidv4(),
    projectId,
    sectionId: section.id,
    planItemId: upsert.planItemId,
    title: upsert.title,
    description: upsert.description ?? '',
    completed: upsert.completed,
    dueDate: null,
    priority: upsert.priority as Priority,
    assigneeId: null,
    sortOrder: count,
    createdAt: now,
    updatedAt: now,
    completedAt: upsert.completed ? now : null,
  }
  await db.tasks.add(task)
  return 'created'
}

export interface ApplyPendingResult {
  created: number
  updated: number
  skipped: number
}

async function pruneOrphanSections(projectId: string, allowedNames: string[]): Promise<number> {
  const allowed = new Set(allowedNames.map((name) => name.toLowerCase()))
  const sections = await db.sections.where('projectId').equals(projectId).toArray()
  let removed = 0

  for (const section of sections) {
    if (allowed.has(section.name.toLowerCase())) continue
    const taskCount = await db.tasks.where('sectionId').equals(section.id).count()
    if (taskCount === 0) {
      await db.sections.delete(section.id)
      removed += 1
    }
  }

  return removed
}

export async function applyPendingSync(
  projectId: string,
  pendingRaw: unknown,
): Promise<ApplyPendingResult> {
  const pending: PendingSync = validatePendingSync(pendingRaw)
  const sections = await ensureProjectSections(projectId, pending.sections)
  const defaultSection = pending.sections[0] ?? 'Backlog'

  const result: ApplyPendingResult = { created: 0, updated: 0, skipped: 0 }

  for (const upsert of pending.upserts) {
    const outcome = await upsertPendingTask(projectId, sections, upsert, defaultSection)
    result[outcome] += 1
  }

  await pruneOrphanSections(projectId, pending.sections)

  return result
}

export async function fetchPendingSync(url: string): Promise<PendingSync | null> {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return null
    const json: unknown = await response.json()
    return validatePendingSync(json)
  } catch {
    return null
  }
}

export async function buildBoardSnapshotForPackage(
  packageName: string,
  hostProjectId: string,
): Promise<import('@projocalypse/core').BoardSnapshot> {
  const { boardSnapshotFromTasks } = await import('@projocalypse/core')
  const sections = await db.sections.where('projectId').equals(hostProjectId).toArray()
  const sectionNameById = new Map(sections.map((section) => [section.id, section.name]))
  const tasks = await db.tasks.where('projectId').equals(hostProjectId).toArray()

  return boardSnapshotFromTasks(
    packageName,
    hostProjectId,
    tasks.map((task) => ({
      id: task.id,
      planItemId: task.planItemId,
      title: task.title,
      completed: task.completed,
      sectionName: sectionNameById.get(task.sectionId) ?? 'Unknown',
      priority: task.priority,
    })),
  )
}

export function downloadBoardSnapshot(snapshot: import('@projocalypse/core').BoardSnapshot): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `projocalypse-board-${snapshot.packageName.replace(/[@/]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
