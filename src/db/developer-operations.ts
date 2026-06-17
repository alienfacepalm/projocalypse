import { v4 as uuidv4 } from 'uuid'
import { db } from '@/db/schema'
import {
  DeveloperPermissionError,
  canAddDeveloper,
  canCreateDeveloperWithRole,
  canManageDeveloperRoster,
  canRemoveDeveloper,
  countMasters,
  isMaster,
  resolveRolePermissions,
} from '@/lib/permissions'
import type { Developer, DeveloperPermissions, DeveloperRole } from '@/models/types'
import { PROJECT_COLORS } from '@/models/types'

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
