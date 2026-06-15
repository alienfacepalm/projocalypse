import { beforeEach, describe, expect, it } from 'vitest'
import {
  archiveProject,
  createProject,
  createSection,
  createSubtask,
  createTask,
  deleteProject,
  deleteSection,
  deleteSubtask,
  deleteTask,
  moveTask,
  moveTaskToSection,
  reorderProjects,
  reorderSections,
  reorderTasks,
  removeGettingStartedProjects,
  setTaskPriority,
  toggleTaskComplete,
  unarchiveProject,
  updateProject,
  updateSection,
  updateSubtask,
  updateTask,
} from '@/db/operations'
import { clearDb } from '@/test/db-helpers'
import { db } from '@/db/schema'

describe('createProject', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('creates project with default sections', async () => {
    const project = await createProject('Alpha', '#F06A6A')
    expect(project.name).toBe('Alpha')
    expect(project.archived).toBe(false)

    const sections = await db.sections.where('projectId').equals(project.id).sortBy('sortOrder')
    expect(sections.map((s) => s.name)).toEqual(['To Do', 'In Progress', 'Done'])
  })

  it('assigns incrementing sortOrder for active projects', async () => {
    const first = await createProject('One', '#F06A6A')
    const second = await createProject('Two', '#4573D2')
    expect(first.sortOrder).toBe(0)
    expect(second.sortOrder).toBe(1)
  })
})

describe('tasks and subtasks', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('creates and updates tasks', async () => {
    const project = await createProject('P', '#4573D2')
    const section = await db.sections.where('projectId').equals(project.id).first()
    const task = await createTask(project.id, section!.id, 'Write tests')
    expect(task.title).toBe('Write tests')
    expect(task.sortOrder).toBe(0)

    await updateTask(task.id, { title: 'Write more tests', priority: 'high' })
    const updated = await db.tasks.get(task.id)
    expect(updated?.title).toBe('Write more tests')
    expect(updated?.priority).toBe('high')
  })

  it('toggles completion and sets completedAt', async () => {
    const project = await createProject('P', '#4573D2')
    const sections = await db.sections.where('projectId').equals(project.id).sortBy('sortOrder')
    const todoSection = sections[0]!
    const doneSection = sections[2]!
    const task = await createTask(project.id, todoSection.id, 'Finish')
    await toggleTaskComplete(task)
    let stored = await db.tasks.get(task.id)
    expect(stored?.completed).toBe(true)
    expect(stored?.completedAt).toBeTypeOf('number')
    expect(stored?.sectionId).toBe(doneSection.id)

    await toggleTaskComplete(stored!)
    stored = await db.tasks.get(task.id)
    expect(stored?.completed).toBe(false)
    expect(stored?.completedAt).toBeNull()
    expect(stored?.sectionId).toBe(todoSection.id)
  })

  it('marks complete when dragged to Done and reopens when moved out', async () => {
    const project = await createProject('P', '#4573D2')
    const sections = await db.sections.where('projectId').equals(project.id).sortBy('sortOrder')
    const todoSection = sections[0]!
    const doneSection = sections[2]!
    const task = await createTask(project.id, todoSection.id, 'Ship it')

    await reorderTasks([{ id: task.id, sectionId: doneSection.id, sortOrder: 0 }])
    let stored = await db.tasks.get(task.id)
    expect(stored?.sectionId).toBe(doneSection.id)
    expect(stored?.completed).toBe(true)

    await reorderTasks([{ id: task.id, sectionId: todoSection.id, sortOrder: 0 }])
    stored = await db.tasks.get(task.id)
    expect(stored?.sectionId).toBe(todoSection.id)
    expect(stored?.completed).toBe(false)
  })

  it('syncs completion when section changes from task detail', async () => {
    const project = await createProject('P', '#4573D2')
    const sections = await db.sections.where('projectId').equals(project.id).sortBy('sortOrder')
    const todoSection = sections[0]!
    const doneSection = sections[2]!
    const task = await createTask(project.id, todoSection.id, 'Via picker')
    await moveTaskToSection(task.id, doneSection.id)
    const stored = await db.tasks.get(task.id)
    expect(stored?.sectionId).toBe(doneSection.id)
    expect(stored?.completed).toBe(true)
  })

  it('creates, updates, and deletes subtasks', async () => {
    const project = await createProject('P', '#4573D2')
    const section = await db.sections.where('projectId').equals(project.id).first()
    const task = await createTask(project.id, section!.id, 'Parent')
    const subtask = await createSubtask(task.id, 'Child')
    expect(subtask.sortOrder).toBe(0)

    await updateSubtask(subtask.id, { title: 'Updated', completed: true })
    const stored = await db.subtasks.get(subtask.id)
    expect(stored?.title).toBe('Updated')
    expect(stored?.completed).toBe(true)

    await deleteSubtask(subtask.id)
    expect(await db.subtasks.count()).toBe(0)
  })

  it('deletes task and cascades subtasks', async () => {
    const project = await createProject('P', '#4573D2')
    const section = await db.sections.where('projectId').equals(project.id).first()
    const task = await createTask(project.id, section!.id, 'Gone')
    await createSubtask(task.id, 'Also gone')
    await deleteTask(task.id)
    expect(await db.tasks.count()).toBe(0)
    expect(await db.subtasks.count()).toBe(0)
  })
})

describe('sections', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('creates and renames sections', async () => {
    const project = await createProject('P', '#4573D2')
    const section = await createSection(project.id, 'Backlog')
    expect(section.sortOrder).toBe(3)
    await updateSection(section.id, 'Icebox')
    expect((await db.sections.get(section.id))?.name).toBe('Icebox')
  })

  it('deletes section and its tasks', async () => {
    const project = await createProject('P', '#4573D2')
    const section = await createSection(project.id, 'Trash')
    await createTask(project.id, section.id, 'Disposable')
    await deleteSection(section.id)
    expect(await db.sections.get(section.id)).toBeUndefined()
    expect(await db.tasks.where('sectionId').equals(section.id).count()).toBe(0)
  })
})

describe('reorder and priority', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('moves a single task', async () => {
    const project = await createProject('P', '#4573D2')
    const sections = await db.sections.where('projectId').equals(project.id).sortBy('sortOrder')
    const task = await createTask(project.id, sections[0].id, 'Move me')
    await moveTask(task.id, sections[1].id, 0)
    const stored = await db.tasks.get(task.id)
    expect(stored?.sectionId).toBe(sections[1].id)
    expect(stored?.sortOrder).toBe(0)
  })

  it('applies batch reorder updates', async () => {
    const project = await createProject('P', '#4573D2')
    const section = await db.sections.where('projectId').equals(project.id).first()
    const a = await createTask(project.id, section!.id, 'A')
    const b = await createTask(project.id, section!.id, 'B')
    await reorderTasks([
      { id: a.id, sectionId: section!.id, sortOrder: 1 },
      { id: b.id, sectionId: section!.id, sortOrder: 0 },
    ])
    expect((await db.tasks.get(a.id))?.sortOrder).toBe(1)
    expect((await db.tasks.get(b.id))?.sortOrder).toBe(0)
  })

  it('sets task priority', async () => {
    const project = await createProject('P', '#4573D2')
    const section = await db.sections.where('projectId').equals(project.id).first()
    const task = await createTask(project.id, section!.id, 'Priority')
    await setTaskPriority(task.id, 'medium')
    expect((await db.tasks.get(task.id))?.priority).toBe('medium')
  })
})

describe('project lifecycle', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('archives a project', async () => {
    const project = await createProject('P', '#4573D2')
    await archiveProject(project.id)
    expect((await db.projects.get(project.id))?.archived).toBe(true)
  })

  it('deletes project and all related records', async () => {
    const project = await createProject('P', '#4573D2')
    const section = await db.sections.where('projectId').equals(project.id).first()
    const task = await createTask(project.id, section!.id, 'Task')
    await createSubtask(task.id, 'Sub')
    await deleteProject(project.id)
    expect(await db.projects.count()).toBe(0)
    expect(await db.sections.count()).toBe(0)
    expect(await db.tasks.count()).toBe(0)
    expect(await db.subtasks.count()).toBe(0)
  })

  it('excludes archived projects from active sort order count', async () => {
    const active = await createProject('Active', '#4573D2')
    const archived = await createProject('Archived', '#F06A6A')
    await updateProject(archived.id, { archived: true })
    const next = await createProject('Next', '#5DA283')
    expect(next.sortOrder).toBe(1)
    expect(active.sortOrder).toBe(0)
  })

  it('unarchives a project', async () => {
    const project = await createProject('Paused', '#4573D2')
    await archiveProject(project.id)
    await unarchiveProject(project.id)
    expect((await db.projects.get(project.id))?.archived).toBe(false)
  })

  it('reorders projects and sections', async () => {
    const project = await createProject('P', '#4573D2')
    const sections = await db.sections.where('projectId').equals(project.id).sortBy('sortOrder')
    await reorderSections([
      { id: sections[2]!.id, sortOrder: 0 },
      { id: sections[0]!.id, sortOrder: 1 },
      { id: sections[1]!.id, sortOrder: 2 },
    ])
    const reordered = await db.sections.where('projectId').equals(project.id).sortBy('sortOrder')
    expect(reordered.map((section) => section.name)).toEqual(['Done', 'To Do', 'In Progress'])

    const second = await createProject('Second', '#F06A6A')
    await reorderProjects([
      { id: second.id, sortOrder: 0 },
      { id: project.id, sortOrder: 1 },
    ])
    const projects = await db.projects.orderBy('sortOrder').toArray()
    expect(projects.map((item) => item.name)).toEqual(['Second', 'P'])
  })
})

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
    expect((await db.projects.toCollection().first())?.name).toBe('My Work')
    expect(await db.tasks.count()).toBe(0)
  })

  it('is a no-op when no Getting Started projects exist', async () => {
    await createProject('My Work', '#5DA283')
    await removeGettingStartedProjects()
    expect(await db.projects.count()).toBe(1)
  })
})
