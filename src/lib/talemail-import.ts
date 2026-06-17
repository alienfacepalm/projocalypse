import talemailMvpBundle from '../../imports/talemail-mvp-projocalypse-import.json'
import { deleteProject, deleteProjectSystem, findWorkspaceActor } from '@/db/operations'
import { db } from '@/db/schema'
import { importProjectsFromBundle, validateExportData } from '@/lib/export-import'
import type { ExportData } from '@/models/types'
import { flushLocalSyncAfterMutation } from '@/lib/sync/browser-sync'

export const TALEMAIL_MVP_PROJECT_ID = 'talemail-mvp'
const TALEMAIL_DISPLAY_NAME = 'Talemail'
const SHIPPED_SECTION_ID = 'sec-shipped'

const talemailMvpData = validateExportData(talemailMvpBundle)

function normalizeCompletedTasksToShipped(data: ExportData): ExportData {
  const sectionById = new Map(data.sections.map((section) => [section.id, section]))
  const openTasks = data.tasks.filter((task) => !task.completed)
  const completedTasks = data.tasks
    .filter((task) => task.completed)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt)

  const shippedTasks = completedTasks.map((task, index) => {
    const originalSection = sectionById.get(task.sectionId)
    const needsOriginalSprint =
      originalSection &&
      task.sectionId !== SHIPPED_SECTION_ID &&
      !task.description.includes('Original sprint:')
    const description = needsOriginalSprint
      ? `${task.description}\n\nOriginal sprint: ${originalSection.name}`
      : task.description

    return {
      ...task,
      sectionId: SHIPPED_SECTION_ID,
      sortOrder: index,
      description,
    }
  })

  const openSortBySection = new Map<string, number>()
  const normalizedOpen = openTasks.map((task) => {
    const sortOrder = openSortBySection.get(task.sectionId) ?? 0
    openSortBySection.set(task.sectionId, sortOrder + 1)
    return { ...task, sortOrder }
  })

  return {
    ...data,
    projects: data.projects.map((project) =>
      project.id === TALEMAIL_MVP_PROJECT_ID ? { ...project, name: TALEMAIL_DISPLAY_NAME } : project,
    ),
    tasks: [...shippedTasks, ...normalizedOpen],
  }
}

export function getTalemailMvpBundle(): ExportData {
  return normalizeCompletedTasksToShipped(talemailMvpData)
}

function isTalemailPlaceholderProject(name: string, id: string): boolean {
  if (id === TALEMAIL_MVP_PROJECT_ID) return false
  return /^talemail(\s+mvp)?$/i.test(name.trim())
}

/** Remove empty manually created Talemail projects so only the imported board remains. */
async function removeEmptyTalemailDuplicates(): Promise<void> {
  const actor = await findWorkspaceActor('manageProjects')
  const projects = await db.projects.toArray()
  for (const project of projects) {
    if (!isTalemailPlaceholderProject(project.name, project.id)) continue
    const taskCount = await db.tasks.where('projectId').equals(project.id).count()
    if (taskCount === 0) {
      if (actor) {
        await deleteProject(actor, project.id)
      } else {
        await deleteProjectSystem(project.id)
      }
    }
  }
}

export function isTalemailProjectName(name: string): boolean {
  return /^talemail(\s+mvp)?$/i.test(name.trim())
}

export async function importTalemailMvpBoard(): Promise<{ projectId: string; taskCount: number }> {
  const data = getTalemailMvpBundle()
  await importProjectsFromBundle(data, [TALEMAIL_MVP_PROJECT_ID])
  await removeEmptyTalemailDuplicates()
  await flushLocalSyncAfterMutation()
  const taskCount = data.tasks.filter((t) => t.projectId === TALEMAIL_MVP_PROJECT_ID).length
  return { projectId: TALEMAIL_MVP_PROJECT_ID, taskCount }
}
