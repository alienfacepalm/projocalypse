import type { Project } from '@/models/types'

export function sortableProjectId(projectId: string): string {
  return `project:${projectId}`
}

export function projectIdFromSortableId(id: string): string {
  return id.slice('project:'.length)
}

export function computeProjectReorderUpdates(
  projects: Project[],
  activeProjectId: string,
  overProjectId: string,
): { id: string; sortOrder: number }[] | null {
  if (activeProjectId === overProjectId) return null

  const sorted = [...projects].sort((a, b) => a.sortOrder - b.sortOrder)
  const activeIndex = sorted.findIndex((project) => project.id === activeProjectId)
  const overIndex = sorted.findIndex((project) => project.id === overProjectId)
  if (activeIndex < 0 || overIndex < 0) return null

  const reordered = [...sorted]
  const [moved] = reordered.splice(activeIndex, 1)
  reordered.splice(overIndex, 0, moved!)

  return reordered.map((project, index) => ({ id: project.id, sortOrder: index }))
}
