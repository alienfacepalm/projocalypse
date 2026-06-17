import type { Project, Task } from '@/models/types'

export interface SearchResult {
  type: 'task' | 'project'
  id: string
  title: string
  subtitle?: string
  projectId?: string
}

export function searchEntities(query: string, projects: Project[], tasks: Task[]): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const results: SearchResult[] = []
  const projectById = new Map(projects.map((project) => [project.id, project]))

  for (const project of projects) {
    if (project.archived) continue
    if (project.name.toLowerCase().includes(q)) {
      results.push({ type: 'project', id: project.id, title: project.name })
    }
  }

  for (const task of tasks) {
    const project = projectById.get(task.projectId)
    if (project?.archived) continue
    const haystack = `${task.title} ${task.description}`.toLowerCase()
    if (!haystack.includes(q)) continue
    results.push({
      type: 'task',
      id: task.id,
      title: task.title,
      subtitle: project?.name,
      projectId: task.projectId,
    })
  }

  return results.slice(0, 25)
}
