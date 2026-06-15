import { beforeEach, describe, expect, it } from 'vitest'
import {
  bootstrapMasterDeveloper,
  createDeveloper,
  createProject,
  createTask,
  deleteProject,
  setTaskAssignee,
} from '@/db/operations'
import { clearDb, seedTestProjectAndMaster } from '@/test/db-helpers'
import { db } from '@/db/schema'
import { DeveloperPermissionError } from '@/lib/permissions'

describe('project-scoped developers', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('bootstraps a single master developer for a project', async () => {
    const project = await createProject('Alpha', '#4573D2')
    const master = await bootstrapMasterDeveloper(project.id, 'Alpha Lead')
    expect(master.role).toBe('master')
    expect(master.projectId).toBe(project.id)
    expect(await db.developers.where('projectId').equals(project.id).count()).toBe(1)
  })

  it('assigns tasks to developers on the same project', async () => {
    const { actor: master, projectId } = await seedTestProjectAndMaster('Lead')
    const teammate = await createDeveloper(master, projectId, 'Teammate')
    const section = await db.sections.where('projectId').equals(projectId).first()
    const task = await createTask(projectId, section!.id, 'Scoped task')

    await setTaskAssignee(master, task.id, teammate.id)
    expect((await db.tasks.get(task.id))?.assigneeId).toBe(teammate.id)
  })

  it('requires manageDevelopers to add teammates', async () => {
    const { actor: master, projectId } = await seedTestProjectAndMaster('Owner')
    const limited = await createDeveloper(master, projectId, 'Limited', {
      permissions: { manageDevelopers: false, assignTasks: true, manageProjects: false },
    })
    await expect(createDeveloper(limited, projectId, 'Nope')).rejects.toBeInstanceOf(
      DeveloperPermissionError,
    )
  })

  it('deletes project developers when the project is removed', async () => {
    const { actor: master, projectId } = await seedTestProjectAndMaster('Owner')
    await deleteProject(master, projectId)
    expect(await db.projects.count()).toBe(0)
    expect(await db.developers.count()).toBe(0)
  })
})
