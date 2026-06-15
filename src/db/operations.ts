import { v4 as uuidv4 } from 'uuid'
import { recordTombstone, recordTombstones } from '@/db/tombstones'
import { db } from '@/db/schema'
import { pickCanonicalSection } from '@/lib/board-lanes'
import {
  DeveloperPermissionError,
  canAddDeveloper,
  canCreateDeveloperWithRole,
  canManageDeveloperRoster,
  canRemoveDeveloper,
  countMasters,
  hasPermission,
  isMaster,
  resolveRolePermissions,
} from '@/lib/permissions'
import type {
  Developer,
  DeveloperPermissions,
  DeveloperRole,
  Priority,
  Project,
  Section,
  Subtask,
  Task,
} from '@/models/types'
import { PROJECT_COLORS } from '@/models/types'

function requirePermission(developer: Developer, permission: keyof DeveloperPermissions): void {
  if (!hasPermission(developer, permission)) {
    throw new DeveloperPermissionError(`Missing permission: ${permission}`)
  }
}

export async function findWorkspaceActor(
  permission?: keyof DeveloperPermissions,
): Promise<Developer | null> {
  const developers = await db.developers.toArray()
  if (permission) {
    return developers.find((developer) => hasPermission(developer, permission)) ?? null
  }
  return developers.find((developer) => isMaster(developer)) ?? developers[0] ?? null
}

export async function createProject(name: string, color: string, actor?: Developer): Promise<Project> {
  if (actor) {
    requirePermission(actor, 'manageProjects')
  } else {
    const totalDevelopers = await db.developers.count()
    if (totalDevelopers > 0) {
      throw new DeveloperPermissionError('Missing permission: manageProjects')
    }
  }
  const now = Date.now()
  const count = await db.projects.filter((p) => !p.archived).count()
  const project: Project = {
    id: uuidv4(),
    name,
    color,
    archived: false,
    sortOrder: count,
    createdAt: now,
    updatedAt: now,
  }

  const todoSectionId = uuidv4()
  const inProgressSectionId = uuidv4()
  const doneSectionId = uuidv4()
  await db.transaction('rw', db.projects, db.sections, async () => {
    await db.projects.add(project)
    await db.sections.bulkAdd([
      { id: todoSectionId, projectId: project.id, name: 'To Do', sortOrder: 0, updatedAt: now },
      { id: inProgressSectionId, projectId: project.id, name: 'In Progress', sortOrder: 1, updatedAt: now },
      { id: doneSectionId, projectId: project.id, name: 'Done', sortOrder: 2, updatedAt: now },
    ])
  })

  return project
}

export async function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'color' | 'archived'>>): Promise<void> {
  await db.projects.update(id, { ...updates, updatedAt: Date.now() })
}

export async function unarchiveProject(id: string): Promise<void> {
  await updateProject(id, { archived: false })
}

export async function reorderProjects(updates: { id: string; sortOrder: number }[]): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.projects, async () => {
    for (const update of updates) {
      await db.projects.update(update.id, { sortOrder: update.sortOrder, updatedAt: now })
    }
  })
}

export async function createSection(projectId: string, name: string): Promise<Section> {
  const now = Date.now()
  const count = await db.sections.where('projectId').equals(projectId).count()
  const section: Section = { id: uuidv4(), projectId, name, sortOrder: count, updatedAt: now }
  await db.sections.add(section)
  return section
}

export async function updateSection(id: string, name: string): Promise<void> {
  await db.sections.update(id, { name, updatedAt: Date.now() })
}

export async function reorderSections(updates: { id: string; sortOrder: number }[]): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.sections, async () => {
    for (const update of updates) {
      await db.sections.update(update.id, { sortOrder: update.sortOrder, updatedAt: now })
    }
  })
}

export async function deleteSection(id: string): Promise<void> {
  const tasks = await db.tasks.where('sectionId').equals(id).toArray()
  const subtasks = await Promise.all(tasks.map((task) => db.subtasks.where('taskId').equals(task.id).toArray()))
  const tombstoneItems = [
    { id, entityType: 'section' as const },
    ...tasks.map((task) => ({ id: task.id, entityType: 'task' as const })),
    ...subtasks.flat().map((subtask) => ({ id: subtask.id, entityType: 'subtask' as const })),
  ]

  await db.transaction('rw', db.sections, db.tasks, db.subtasks, async () => {
    for (const task of tasks) {
      await db.subtasks.where('taskId').equals(task.id).delete()
    }
    await db.tasks.where('sectionId').equals(id).delete()
    await db.sections.delete(id)
  })
  await recordTombstones(tombstoneItems)
}

export async function createTask(projectId: string, sectionId: string, title: string): Promise<Task> {
  const count = await db.tasks.where('sectionId').equals(sectionId).count()
  const now = Date.now()
  const task: Task = {
    id: uuidv4(),
    projectId,
    sectionId,
    planItemId: null,
    title,
    description: '',
    completed: false,
    dueDate: null,
    priority: 'none',
    assigneeId: null,
    sortOrder: count,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  }
  await db.tasks.add(task)
  return task
}

export async function updateTask(
  id: string,
  updates: Partial<
    Pick<Task, 'title' | 'description' | 'dueDate' | 'priority' | 'sectionId' | 'sortOrder' | 'completed' | 'completedAt' | 'assigneeId' | 'planItemId'>
  >,
): Promise<void> {
  await db.tasks.update(id, { ...updates, updatedAt: Date.now() })
}

export async function toggleTaskComplete(task: Task): Promise<void> {
  const completed = !task.completed
  const now = Date.now()
  const sections = await db.sections.where('projectId').equals(task.projectId).sortBy('sortOrder')
  const targetSection = pickCanonicalSection(sections, completed ? 'done' : 'todo')
  const sectionChanged = targetSection && targetSection.id !== task.sectionId
  const sortOrder = sectionChanged
    ? await db.tasks.where('sectionId').equals(targetSection!.id).count()
    : task.sortOrder

  await db.tasks.update(task.id, {
    completed,
    completedAt: completed ? now : null,
    ...(sectionChanged ? { sectionId: targetSection!.id, sortOrder } : {}),
    updatedAt: now,
  })
}

export async function deleteTask(id: string): Promise<void> {
  const subtasks = await db.subtasks.where('taskId').equals(id).toArray()
  await db.transaction('rw', db.tasks, db.subtasks, async () => {
    await db.subtasks.where('taskId').equals(id).delete()
    await db.tasks.delete(id)
  })
  await recordTombstones([
    { id, entityType: 'task' },
    ...subtasks.map((subtask) => ({ id: subtask.id, entityType: 'subtask' as const })),
  ])
}

export async function moveTask(taskId: string, sectionId: string, sortOrder: number): Promise<void> {
  await db.tasks.update(taskId, { sectionId, sortOrder, updatedAt: Date.now() })
}

export async function reorderTasks(updates: { id: string; sectionId: string; sortOrder: number }[]): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.tasks, async () => {
    for (const update of updates) {
      await db.tasks.update(update.id, { sectionId: update.sectionId, sortOrder: update.sortOrder, updatedAt: now })
    }
  })
}

export async function applyBoardTaskUpdates(
  updates: {
    id: string
    sectionId: string
    sortOrder: number
    completed?: boolean
    completedAt?: number | null
  }[],
): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.tasks, async () => {
    for (const update of updates) {
      const patch: Partial<Task> = {
        sectionId: update.sectionId,
        sortOrder: update.sortOrder,
        updatedAt: now,
      }
      if (update.completed !== undefined) patch.completed = update.completed
      if (update.completedAt !== undefined) patch.completedAt = update.completedAt
      await db.tasks.update(update.id, patch)
    }
  })
}

export async function createSubtask(taskId: string, title: string): Promise<Subtask> {
  const now = Date.now()
  const count = await db.subtasks.where('taskId').equals(taskId).count()
  const subtask: Subtask = { id: uuidv4(), taskId, title, completed: false, sortOrder: count, updatedAt: now }
  await db.subtasks.add(subtask)
  return subtask
}

export async function updateSubtask(id: string, updates: Partial<Pick<Subtask, 'title' | 'completed'>>): Promise<void> {
  await db.subtasks.update(id, { ...updates, updatedAt: Date.now() })
}

export async function deleteSubtask(id: string): Promise<void> {
  await db.subtasks.delete(id)
  await recordTombstone(id, 'subtask')
}

export async function setTaskPriority(id: string, priority: Priority): Promise<void> {
  await db.tasks.update(id, { priority, updatedAt: Date.now() })
}

export async function setTaskAssignee(
  actor: Developer,
  id: string,
  assigneeId: string | null,
): Promise<void> {
  requirePermission(actor, 'assignTasks')
  const task = await db.tasks.get(id)
  if (!task) return

  if (assigneeId !== null) {
    const assignee = await db.developers.get(assigneeId)
    if (!assignee) {
      throw new Error('Assignee developer not found.')
    }
    if (assignee.projectId !== task.projectId) {
      throw new Error('Assignee must belong to the same project as the task.')
    }
  }
  await db.tasks.update(id, { assigneeId, updatedAt: Date.now() })
}

export async function bootstrapMasterDeveloper(projectId: string, name: string): Promise<Developer> {
  const project = await db.projects.get(projectId)
  if (!project) {
    throw new Error(`Project "${projectId}" not found.`)
  }

  const count = await db.developers.where('projectId').equals(projectId).count()
  if (count > 0) {
    throw new Error('Developers already exist for this project — bootstrap is only for an empty roster.')
  }

  const now = Date.now()
  const developer: Developer = {
    id: uuidv4(),
    projectId,
    name: name.trim() || 'You',
    color: PROJECT_COLORS[0],
    initials: null,
    role: 'master',
    permissions: resolveRolePermissions('master'),
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  }
  await db.developers.add(developer)
  return developer
}

export async function createDeveloper(
  actor: Developer,
  projectId: string,
  name: string,
  options?: {
    color?: string
    role?: DeveloperRole
    permissions?: Partial<DeveloperPermissions>
  },
): Promise<Developer> {
  if (!canAddDeveloper(actor)) {
    throw new DeveloperPermissionError('Missing permission to add developers.')
  }
  if (actor.projectId !== projectId) {
    throw new DeveloperPermissionError('Actor must belong to the target project.')
  }

  const now = Date.now()
  const count = await db.developers.where('projectId').equals(projectId).count()
  const role = options?.role ?? 'developer'
  if (!canCreateDeveloperWithRole(actor, role)) {
    throw new DeveloperPermissionError('You cannot add a developer with that role.')
  }
  const developer: Developer = {
    id: uuidv4(),
    projectId,
    name: name.trim(),
    color: options?.color ?? PROJECT_COLORS[count % PROJECT_COLORS.length],
    initials: null,
    role,
    permissions: resolveRolePermissions(role, options?.permissions),
    sortOrder: count,
    createdAt: now,
    updatedAt: now,
  }
  await db.developers.add(developer)
  return developer
}

export async function updateDeveloper(
  actor: Developer,
  id: string,
  updates: Partial<
    Pick<Developer, 'name' | 'color' | 'initials' | 'sortOrder' | 'role' | 'permissions'>
  >,
): Promise<void> {
  const target = await db.developers.get(id)
  if (!target) return

  const isSelf = actor.id === id

  if (!isSelf && actor.projectId !== target.projectId) {
    throw new DeveloperPermissionError('Actor must belong to the same project as the developer.')
  }

  const roleChanging = updates.role !== undefined && updates.role !== target.role
  const permissionsChanging = updates.permissions !== undefined

  if (roleChanging && !isMaster(actor)) {
    throw new DeveloperPermissionError('Only Master Developers can change roles.')
  }

  if (roleChanging || permissionsChanging) {
    if (!canManageDeveloperRoster(actor)) {
      throw new DeveloperPermissionError('Missing permission: manageDevelopers')
    }
  } else if (!isSelf) {
    if (!canManageDeveloperRoster(actor)) {
      throw new DeveloperPermissionError('Missing permission: manageDevelopers')
    }
  }

  if (roleChanging && isMaster(target) && updates.role === 'developer') {
    const roster = await db.developers.where('projectId').equals(target.projectId).toArray()
    if (countMasters(roster) <= 1) {
      throw new DeveloperPermissionError('Cannot demote the last Master Developer.')
    }
  }

  const patch: Partial<Developer> = { ...updates, updatedAt: Date.now() }
  if (typeof updates.name === 'string') {
    patch.name = updates.name.trim()
  }
  if (updates.role !== undefined) {
    patch.permissions = resolveRolePermissions(updates.role, updates.permissions ?? target.permissions)
  } else if (updates.permissions !== undefined && !isMaster(target) && target.role !== 'lead') {
    patch.permissions = resolveRolePermissions('developer', updates.permissions)
  }
  await db.developers.update(id, patch)
}

export async function deleteDeveloper(actor: Developer, id: string): Promise<void> {
  const target = await db.developers.get(id)
  if (!target) return

  const roster = await db.developers.where('projectId').equals(target.projectId).toArray()
  const check = canRemoveDeveloper(actor, target, roster)
  if (!check.ok) {
    throw new DeveloperPermissionError(check.reason)
  }

  await db.transaction('rw', db.developers, db.tasks, async () => {
    const tasks = await db.tasks.where('assigneeId').equals(id).toArray()
    const now = Date.now()
    for (const task of tasks) {
      await db.tasks.update(task.id, { assigneeId: null, updatedAt: now })
    }
    await db.developers.delete(id)
  })
}

export async function reorderDevelopers(updates: { id: string; sortOrder: number }[]): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.developers, async () => {
    for (const update of updates) {
      await db.developers.update(update.id, { sortOrder: update.sortOrder, updatedAt: now })
    }
  })
}

export async function archiveProject(id: string): Promise<void> {
  await updateProject(id, { archived: true })
}

export async function deleteProject(actor: Developer, id: string): Promise<void> {
  requirePermission(actor, 'manageProjects')
  await deleteProjectUnsafe(id)
}

async function deleteProjectUnsafe(id: string): Promise<void> {
  const sections = await db.sections.where('projectId').equals(id).toArray()
  const tasks = await db.tasks.where('projectId').equals(id).toArray()
  const subtasks = await Promise.all(tasks.map((task) => db.subtasks.where('taskId').equals(task.id).toArray()))
  const tombstoneItems = [
    { id, entityType: 'project' as const },
    ...sections.map((section) => ({ id: section.id, entityType: 'section' as const })),
    ...tasks.map((task) => ({ id: task.id, entityType: 'task' as const })),
    ...subtasks.flat().map((subtask) => ({ id: subtask.id, entityType: 'subtask' as const })),
  ]

  await db.transaction('rw', [db.projects, db.sections, db.tasks, db.subtasks, db.developers], async () => {
    for (const task of tasks) {
      await db.subtasks.where('taskId').equals(task.id).delete()
    }
    await db.tasks.where('projectId').equals(id).delete()
    await db.sections.where('projectId').equals(id).delete()
    await db.developers.where('projectId').equals(id).delete()
    await db.projects.delete(id)
  })
  await recordTombstones(tombstoneItems)
}

const GETTING_STARTED_NAME = 'Getting Started'

/** Removes legacy demo projects seeded in earlier versions. */
export async function removeGettingStartedProjects(): Promise<void> {
  const projects = await db.projects.filter((p) => p.name === GETTING_STARTED_NAME).toArray()
  for (const project of projects) {
    await deleteProjectUnsafe(project.id)
  }
}
