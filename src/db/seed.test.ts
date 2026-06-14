import { beforeEach, describe, expect, it } from 'vitest'
import { seedIfEmpty } from '@/db/seed'
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
})
