import type { Developer, DeveloperPermissions, DeveloperRole } from '@/models/types'

export const MASTER_PERMISSIONS: DeveloperPermissions = {
  manageDevelopers: true,
  assignTasks: true,
  manageProjects: true,
}

/** Team leads: grow the roster and assign work; no project delete or full roster admin. */
export const LEAD_PERMISSIONS: DeveloperPermissions = {
  manageDevelopers: false,
  assignTasks: true,
  manageProjects: false,
}

export const DEFAULT_DEVELOPER_PERMISSIONS: DeveloperPermissions = {
  manageDevelopers: false,
  assignTasks: true,
  manageProjects: false,
}

export class DeveloperPermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeveloperPermissionError'
  }
}

export function isMaster(developer: Pick<Developer, 'role'>): boolean {
  return developer.role === 'master'
}

export function isLead(developer: Pick<Developer, 'role'>): boolean {
  return developer.role === 'lead'
}

export function canAddDeveloper(actor: Developer): boolean {
  return isMaster(actor) || isLead(actor)
}

/** Full roster control: edit/remove others, change roles (masters only). */
export function canManageDeveloperRoster(actor: Developer): boolean {
  return hasPermission(actor, 'manageDevelopers')
}

export function canCreateDeveloperWithRole(actor: Developer, role: DeveloperRole): boolean {
  if (isMaster(actor)) return true
  if (isLead(actor)) return role === 'developer'
  return false
}

export function effectivePermissions(developer: Developer): DeveloperPermissions {
  if (isMaster(developer)) return MASTER_PERMISSIONS
  if (isLead(developer)) return LEAD_PERMISSIONS
  return developer.permissions
}

export function hasPermission(
  developer: Developer,
  permission: keyof DeveloperPermissions,
): boolean {
  return effectivePermissions(developer)[permission]
}

export function countMasters(developers: Developer[]): number {
  return developers.filter((developer) => isMaster(developer)).length
}

export function canRemoveDeveloper(
  actor: Developer,
  target: Developer,
  allDevelopers: Developer[],
): { ok: true } | { ok: false; reason: string } {
  if (!hasPermission(actor, 'manageDevelopers')) {
    return { ok: false, reason: 'You do not have permission to remove developers.' }
  }
  if (isMaster(target) && countMasters(allDevelopers) <= 1) {
    return { ok: false, reason: 'Cannot remove the last Master Developer.' }
  }
  return { ok: true }
}

export function resolveRolePermissions(
  role: DeveloperRole,
  permissions?: Partial<DeveloperPermissions>,
): DeveloperPermissions {
  if (role === 'master') return MASTER_PERMISSIONS
  if (role === 'lead') return LEAD_PERMISSIONS
  return {
    ...DEFAULT_DEVELOPER_PERMISSIONS,
    ...permissions,
    manageDevelopers: false,
  }
}
