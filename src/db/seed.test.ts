import { beforeEach, describe, expect, it } from 'vitest'
import {
  initializeDatabase,
  removeDuplicateGettingStartedProjects,
  seedIfEmpty,
} from '@/db/seed'
import { createProject } from '@/db/operations'
import { clearDb } from '@/test/db-helpers'
import { db } from '@/db/schema'

describe('seedIfEmpty', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('seeds demo data when database is empty', async () => {
    await seedIfEmpty()
    expect(await db.projects.count()).toBe(1)
    expect(await db.sections.count()).toBe(3)
    expect(await db.tasks.count()).toBe(3)

    const project = await db.projects.toCollection().first()
    expect(project?.name).toBe('Getting Started')
  })

  it('does not seed when projects already exist', async () => {
    await seedIfEmpty()
    await seedIfEmpty()
    expect(await db.projects.count()).toBe(1)
    expect(await db.tasks.count()).toBe(3)
  })

  it('creates only one project when called concurrently', async () => {
    await Promise.all([seedIfEmpty(), seedIfEmpty(), seedIfEmpty()])
    expect(await db.projects.count()).toBe(1)
    expect(await db.tasks.count()).toBe(3)
  })
})

describe('removeDuplicateGettingStartedProjects', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('keeps the oldest Getting Started project and removes newer duplicates', async () => {
    const oldest = await createProject('Getting Started', '#4573D2')
    await db.projects.update(oldest.id, { createdAt: 1000, updatedAt: 1000 })

    const duplicate = await createProject('Getting Started', '#4573D2')
    await db.projects.update(duplicate.id, { createdAt: 2000, updatedAt: 2000 })

    await createProject('My Work', '#5DA283')

    await removeDuplicateGettingStartedProjects()

    expect(await db.projects.count()).toBe(2)
    const gettingStarted = await db.projects.filter((p) => p.name === 'Getting Started').toArray()
    expect(gettingStarted).toHaveLength(1)
    expect(gettingStarted[0]?.id).toBe(oldest.id)
  })

  it('is a no-op when only one Getting Started project exists', async () => {
    await seedIfEmpty()
    await removeDuplicateGettingStartedProjects()
    expect(await db.projects.count()).toBe(1)
  })
})

describe('initializeDatabase', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('dedupes existing Getting Started projects on startup', async () => {
    const older = await createProject('Getting Started', '#4573D2')
    await db.projects.update(older.id, { createdAt: 1000, updatedAt: 1000 })
    const newer = await createProject('Getting Started', '#4573D2')
    await db.projects.update(newer.id, { createdAt: 2000, updatedAt: 2000 })

    await initializeDatabase()

    expect(await db.projects.filter((p) => p.name === 'Getting Started').count()).toBe(1)
    const kept = await db.projects.filter((p) => p.name === 'Getting Started').first()
    expect(kept?.id).toBe(older.id)
  })

  it('seeds demo project when database is empty', async () => {
    await initializeDatabase()
    expect(await db.projects.count()).toBe(1)
    expect(await db.tasks.count()).toBe(3)
  })
})
