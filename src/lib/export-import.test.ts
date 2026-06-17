import { describe, expect, it } from 'vitest'
import { exportData, importData, importProjectsFromBundle, importSyncData, parseImportJson, validateExportData } from '@/lib/export-import'
import { clearDb, makeDeveloper, makeExportData, makeProject, makeSection, makeSubtask, makeTask } from '@/test/db-helpers'
import { db } from '@/db/schema'

describe('validateExportData', () => {
  it('accepts a valid v2 backup', () => {
    const data = makeExportData()
    expect(validateExportData(data)).toEqual(data)
  })

  it('accepts a valid v1 backup without developers', () => {
    const data = makeExportData({ version: 1, developers: undefined })
    const validated = validateExportData(data)
    expect(validated.version).toBe(1)
    expect(validated.developers).toBeUndefined()
  })

  it('rejects non-object top level', () => {
    expect(() => validateExportData(null)).toThrow(/expected a JSON object/)
    expect(() => validateExportData('nope')).toThrow(/expected a JSON object/)
  })

  it('rejects unsupported version', () => {
    expect(() => validateExportData({ ...makeExportData(), version: 3 })).toThrow(/Unsupported backup version/)
  })

  it('rejects missing entity arrays', () => {
    const base = makeExportData()
    expect(() => validateExportData({ ...base, projects: 'bad' })).toThrow(/"projects" must be an array/)
  })

  it('rejects invalid task priority', () => {
    const data = makeExportData({
      tasks: [makeTask({ priority: 'urgent' as never })],
    })
    expect(() => validateExportData(data)).toThrow(/priority is invalid/)
  })

  it('rejects empty project id', () => {
    const data = makeExportData({
      projects: [makeProject({ id: '   ' })],
    })
    expect(() => validateExportData(data)).toThrow(/must be a non-empty string/)
  })

  it('parses assigneeId on tasks', () => {
    const data = makeExportData({
      tasks: [makeTask({ assigneeId: 'dev-1' })],
      developers: [makeDeveloper({ id: 'dev-1' })],
    })
    expect(validateExportData(data).tasks[0].assigneeId).toBe('dev-1')
  })
})

describe('parseImportJson', () => {
  it('parses valid JSON text', () => {
    const data = makeExportData()
    expect(parseImportJson(JSON.stringify(data))).toEqual(data)
  })

  it('rejects malformed JSON', () => {
    expect(() => parseImportJson('{not json')).toThrow(/Invalid JSON/)
  })
})

describe('exportData and importData', () => {
  it('round-trips database contents including developers', async () => {
    await clearDb()
    const data = makeExportData()
    await db.projects.bulkAdd(data.projects)
    await db.sections.bulkAdd(data.sections)
    await db.tasks.bulkAdd(data.tasks)
    await db.subtasks.bulkAdd(data.subtasks)
    if (data.developers?.length) {
      await db.developers.bulkAdd(data.developers)
    }

    const exported = await exportData()
    expect(exported.version).toBe(2)
    expect(exported.projects).toHaveLength(1)
    expect(exported.developers).toHaveLength(1)
    expect(exported.tasks[0].title).toBe('Test task')

    await clearDb()
    await importData(data)

    const projects = await db.projects.toArray()
    const tasks = await db.tasks.toArray()
    const developers = await db.developers.toArray()
    expect(projects).toHaveLength(1)
    expect(tasks[0].title).toBe('Test task')
    expect(developers).toHaveLength(1)
    expect(developers[0].name).toBe('Alex Dev')
  })

  it('replaces existing data on import', async () => {
    await clearDb()
    await db.projects.add(makeProject({ id: 'old', name: 'Old' }))
    await importData(makeExportData({ projects: [makeProject({ name: 'New' })] }))

    const projects = await db.projects.toArray()
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('New')
  })
})

describe('importProjectsFromBundle', () => {
  it('merges a project without deleting unrelated projects', async () => {
    await clearDb()
    await db.projects.add(makeProject({ id: 'other', name: 'Other project' }))

    const bundle = makeExportData({
      projects: [makeProject({ id: 'talemail-mvp', name: 'Talemail MVP' })],
      sections: [makeSection({ id: 'sec-1', projectId: 'talemail-mvp', name: 'Sprint 0' })],
      tasks: [makeTask({ id: 'task-1', projectId: 'talemail-mvp', sectionId: 'sec-1', title: 'S0-01' })],
      subtasks: [],
    })

    await importProjectsFromBundle(bundle, ['talemail-mvp'])

    const projects = await db.projects.toArray()
    expect(projects).toHaveLength(2)
    expect(projects.map((p) => p.name).sort()).toEqual(['Other project', 'Talemail MVP'])
    expect(await db.tasks.count()).toBe(1)
  })

  it('replaces an existing project with the same id', async () => {
    await clearDb()
    await db.projects.add(makeProject({ id: 'talemail-mvp', name: 'Stale' }))
    await db.sections.add(makeSection({ id: 'old-sec', projectId: 'talemail-mvp' }))
    await db.tasks.add(makeTask({ id: 'old-task', projectId: 'talemail-mvp', sectionId: 'old-sec', title: 'Old task' }))

    const bundle = makeExportData({
      projects: [makeProject({ id: 'talemail-mvp', name: 'Talemail MVP' })],
      sections: [makeSection({ id: 'sec-new', projectId: 'talemail-mvp', name: 'Sprint 1' })],
      tasks: [makeTask({ id: 'task-new', projectId: 'talemail-mvp', sectionId: 'sec-new', title: 'S1-01' })],
      subtasks: [],
    })

    await importProjectsFromBundle(bundle, ['talemail-mvp'])

    expect(await db.projects.count()).toBe(1)
    expect((await db.projects.get('talemail-mvp'))?.name).toBe('Talemail MVP')
    expect(await db.tasks.toArray()).toEqual([expect.objectContaining({ title: 'S1-01' })])
  })
})

describe('importSyncData', () => {
  it('imports tombstones and removes tombstoned entities', async () => {
    await clearDb()
    const data = makeExportData()
    await importSyncData(data, [{ id: 'task-1', entityType: 'task', deletedAt: Date.now() + 1000 }])

    expect(await db.tasks.count()).toBe(0)
    expect(await db.tombstones.count()).toBe(1)
  })

  it('dedupes duplicate tombstone ids on re-import', async () => {
    await clearDb()
    const data = makeExportData()
    const tombstones = [
      { id: 'task-1', entityType: 'task' as const, deletedAt: 100 },
      { id: 'task-1', entityType: 'task' as const, deletedAt: 200 },
    ]

    await importSyncData(data, tombstones)
    await importSyncData(data, tombstones)

    expect(await db.tombstones.count()).toBe(1)
    expect((await db.tombstones.get('task-1'))?.deletedAt).toBe(200)
  })
})

describe('referential shape', () => {
  it('accepts empty arrays for all entities', () => {
    const data = makeExportData({
      projects: [],
      sections: [],
      tasks: [],
      subtasks: [],
      developers: [],
    })
    expect(validateExportData(data).projects).toEqual([])
  })

  it('allows null dueDate and completedAt', () => {
    const data = makeExportData({
      tasks: [makeTask({ dueDate: null, completedAt: null })],
      subtasks: [makeSubtask()],
      sections: [makeSection()],
    })
    expect(validateExportData(data).tasks[0].dueDate).toBeNull()
  })
})
