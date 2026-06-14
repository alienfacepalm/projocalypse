import { describe, expect, it } from 'vitest'
import { exportData, importData, parseImportJson, validateExportData } from '@/lib/export-import'
import { clearDb, makeExportData, makeProject, makeSection, makeSubtask, makeTask } from '@/test/db-helpers'
import { db } from '@/db/schema'

describe('validateExportData', () => {
  it('accepts a valid v1 backup', () => {
    const data = makeExportData()
    expect(validateExportData(data)).toEqual(data)
  })

  it('rejects non-object top level', () => {
    expect(() => validateExportData(null)).toThrow(/expected a JSON object/)
    expect(() => validateExportData('nope')).toThrow(/expected a JSON object/)
  })

  it('rejects unsupported version', () => {
    expect(() => validateExportData({ ...makeExportData(), version: 2 })).toThrow(/Unsupported backup version/)
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
  it('round-trips database contents', async () => {
    await clearDb()
    const data = makeExportData()
    await db.projects.bulkAdd(data.projects)
    await db.sections.bulkAdd(data.sections)
    await db.tasks.bulkAdd(data.tasks)
    await db.subtasks.bulkAdd(data.subtasks)

    const exported = await exportData()
    expect(exported.projects).toHaveLength(1)
    expect(exported.tasks[0].title).toBe('Test task')

    await clearDb()
    await importData(data)

    const projects = await db.projects.toArray()
    const tasks = await db.tasks.toArray()
    expect(projects).toHaveLength(1)
    expect(tasks[0].title).toBe('Test task')
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

describe('referential shape', () => {
  it('accepts empty arrays for all entities', () => {
    const data = makeExportData({
      projects: [],
      sections: [],
      tasks: [],
      subtasks: [],
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
