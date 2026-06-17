import { beforeEach, describe, expect, it } from 'vitest'
import {
  enforceTombstones,
  filterByTombstones,
  mergeTombstoneLists,
  recordTombstone,
} from '@/db/tombstones'
import { clearDb, makeTask } from '@/test/db-helpers'
import { db } from '@/db/schema'
import { bootstrapMasterDeveloper, createProject, createTask, deleteTask } from '@/db/operations'

describe('tombstones', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('filters entities tombstoned after their updatedAt', () => {
    const task = makeTask({ id: 't1', updatedAt: 100 })
    const filtered = filterByTombstones([task], new Map([['t1', 200]]))
    expect(filtered).toEqual([])
  })

  it('keeps entities updated after tombstone', () => {
    const task = makeTask({ id: 't1', updatedAt: 300 })
    const filtered = filterByTombstones([task], new Map([['t1', 200]]))
    expect(filtered).toEqual([task])
  })

  it('merges tombstone lists keeping latest deletedAt', () => {
    const merged = mergeTombstoneLists(
      [{ id: 'a', entityType: 'task', deletedAt: 100 }],
      [{ id: 'a', entityType: 'task', deletedAt: 200 }],
    )
    expect(merged).toEqual([{ id: 'a', entityType: 'task', deletedAt: 200 }])
  })

  it('records tombstones on task delete and enforces them', async () => {
    const seed = await createProject('Seed', '#4573D2')
    const actor = await bootstrapMasterDeveloper(seed.id, 'Test')
    const project = await createProject('P', '#4573D2', actor)
    const section = await db.sections.where('projectId').equals(project.id).first()
    const task = await createTask(project.id, section!.id, 'Gone')
    await deleteTask(task.id)
    expect(await db.tasks.count()).toBe(0)
    expect(await db.tombstones.count()).toBe(1)

    await db.tasks.add({ ...task, updatedAt: 50 })
    await enforceTombstones()
    expect(await db.tasks.count()).toBe(0)
  })

  it('recordTombstone updates deletedAt when called again', async () => {
    await recordTombstone('x', 'task')
    const first = await db.tombstones.get('x')
    await new Promise((resolve) => setTimeout(resolve, 2))
    await recordTombstone('x', 'task')
    const second = await db.tombstones.get('x')
    expect(second!.deletedAt).toBeGreaterThanOrEqual(first!.deletedAt)
  })
})
