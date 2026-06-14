import { beforeEach, describe, expect, it } from 'vitest'
import { createProject, createTask } from '@/db/operations'
import { removeGettingStartedProjects } from '@/db/cleanup-getting-started'
import { clearDb } from '@/test/db-helpers'
import { db } from '@/db/schema'

describe('removeGettingStartedProjects', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('deletes all projects named Getting Started', async () => {
    const demo = await createProject('Getting Started', '#4573D2')
    const section = await db.sections.where('projectId').equals(demo.id).first()
    await createTask(demo.id, section!.id, 'Demo task')
    await createProject('My Work', '#5DA283')

    await removeGettingStartedProjects()

    expect(await db.projects.count()).toBe(1)
    const remaining = await db.projects.toCollection().first()
    expect(remaining?.name).toBe('My Work')
    expect(await db.tasks.count()).toBe(0)
  })

  it('removes duplicate Getting Started projects', async () => {
    await createProject('Getting Started', '#4573D2')
    await createProject('Getting Started', '#4573D2')
    await createProject('My Work', '#5DA283')

    await removeGettingStartedProjects()

    expect(await db.projects.count()).toBe(1)
    expect((await db.projects.toCollection().first())?.name).toBe('My Work')
  })

  it('is a no-op when no Getting Started projects exist', async () => {
    await createProject('My Work', '#5DA283')

    await removeGettingStartedProjects()

    expect(await db.projects.count()).toBe(1)
  })
})
