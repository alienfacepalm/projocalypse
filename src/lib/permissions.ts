import type { Developer, DeveloperPermissions, DeveloperRole } from '@/models/types'

export const MASTER_PERMISSIONS: DeveloperPermissions = {
  manageDevelopers: true,
  assignTasks: true,
  manageProjects: true,
}

export const DEFAULT_DEVELOPER_PERMISSIONS: DeveloperPermissions = {
  manageDevelopers: false,
  assignTasks: true,
  manageProjects: true,
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

export function effectivePermissions(developer: Developer): DeveloperPermissions {
  if (isMaster(developer)) return MASTER_PERMISSIONS
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
  return {
    ...DEFAULT_DEVELOPER_PERMISSIONS,
    ...permissions,
    manageDevelopers: false,
  }
}
