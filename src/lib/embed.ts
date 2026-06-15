import type { Developer, ExportData } from '@/models/types'

/** Configuration when Projocalypse is mounted inside a host app (e.g. Talemail). */
export interface EmbedConfig {
  embedded: boolean
  hostProjectId: string | null
  productName: string
  tagline: string
  hideSidebar: boolean
  hideProjectSwitcher: boolean
}

export const STANDALONE_EMBED_CONFIG: EmbedConfig = {
  embedded: false,
  hostProjectId: null,
  productName: 'Projocalypse',
  tagline: 'Project command',
  hideSidebar: false,
  hideProjectSwitcher: false,
}

export function mergeEmbedConfig(partial?: Partial<EmbedConfig>): EmbedConfig {
  return { ...STANDALONE_EMBED_CONFIG, ...partial }
}

/** Developers belonging to a single project roster. */
export function developersForProject(developers: Developer[], projectId: string): Developer[] {
  return developers.filter((developer) => developer.projectId === projectId)
}

type LegacyDeveloper = Developer & { projectId?: string }

/** Assign legacy imports without projectId to the first project in the backup. */
export function normalizeImportedDevelopers(
  developers: LegacyDeveloper[],
  fallbackProjectId: string,
): Developer[] {
  return developers.map((developer) => {
    if (developer.projectId) return developer
    return { ...developer, projectId: fallbackProjectId }
  })
}

/** Slice a full export down to one host project and its related entities. */
export function sliceExportForProject(data: ExportData, projectId: string): ExportData {
  const projects = data.projects.filter((project) => project.id === projectId)
  if (projects.length === 0) {
    throw new Error(`Export slice failed — project "${projectId}" not found in backup.`)
  }

  const sections = data.sections.filter((section) => section.projectId === projectId)
  const sectionIds = new Set(sections.map((section) => section.id))
  const tasks = data.tasks.filter((task) => task.projectId === projectId && sectionIds.has(task.sectionId))
  const taskIds = new Set(tasks.map((task) => task.id))
  const subtasks = data.subtasks.filter((subtask) => taskIds.has(subtask.taskId))
  const developers = developersForProject(data.developers ?? [], projectId)

  return {
    ...data,
    projects,
    sections,
    tasks,
    subtasks,
    developers,
  }
}
