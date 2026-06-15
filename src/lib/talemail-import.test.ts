import { describe, expect, it } from 'vitest'
import { getTalemailMvpBundle, importTalemailMvpBoard, TALEMAIL_MVP_PROJECT_ID } from '@/lib/talemail-import'
import { clearDb } from '@/test/db-helpers'
import { db } from '@/db/schema'

describe('talemail import bundle', () => {
  it('ships 136 tasks across 9 sections', () => {
    const data = getTalemailMvpBundle()
    expect(data.projects).toHaveLength(1)
    expect(data.projects[0]?.id).toBe(TALEMAIL_MVP_PROJECT_ID)
    expect(data.projects[0]?.name).toBe('Talemail')
    expect(data.sections).toHaveLength(9)
    expect(data.tasks).toHaveLength(136)
  })

  it('imports all tasks into IndexedDB', async () => {
    await clearDb()
    const { taskCount } = await importTalemailMvpBoard()
    expect(taskCount).toBe(136)
    expect(await db.projects.get(TALEMAIL_MVP_PROJECT_ID)).toMatchObject({ name: 'Talemail' })
    expect(await db.tasks.where('projectId').equals(TALEMAIL_MVP_PROJECT_ID).count()).toBe(136)
    expect(await db.sections.where('projectId').equals(TALEMAIL_MVP_PROJECT_ID).count()).toBe(9)
  })

  it('places every completed task in the Shipped section', () => {
    const data = getTalemailMvpBundle()
    const completed = data.tasks.filter((task) => task.completed)
    expect(completed.length).toBeGreaterThan(0)
    expect(completed.every((task) => task.sectionId === 'sec-shipped')).toBe(true)
  })

  it('records original sprint on completed items moved from sprint columns', () => {
    const data = getTalemailMvpBundle()
    const s104 = data.tasks.find((task) => task.id === 's1-04')
    expect(s104?.sectionId).toBe('sec-shipped')
    expect(s104?.description).toContain('Original sprint: Sprint 1 — Ship blockers')
    expect(s104?.description).toContain('PR #46')
  })

  it('removes an empty manually created Talemail project', async () => {
    await clearDb()
    const { createProject } = await import('@/db/operations')
    const manual = await createProject('Talemail', '#4573D2')
    await importTalemailMvpBoard()
    expect(await db.projects.get(manual.id)).toBeUndefined()
    expect(await db.projects.get(TALEMAIL_MVP_PROJECT_ID)).toBeDefined()
  })
})
