import { deleteProject } from './operations'
import { db } from './schema'

const GETTING_STARTED_NAME = 'Getting Started'

/** Removes legacy demo projects seeded in earlier versions. */
export async function removeGettingStartedProjects(): Promise<void> {
  const projects = await db.projects.filter((p) => p.name === GETTING_STARTED_NAME).toArray()
  for (const project of projects) {
    await deleteProject(project.id)
  }
}
