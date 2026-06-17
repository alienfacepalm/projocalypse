import { db } from '@/db/schema'
import { DeveloperPermissionError, hasPermission, isMaster } from '@/lib/permissions'
import type { Developer, DeveloperPermissions } from '@/models/types'

export function requirePermission(developer: Developer, permission: keyof DeveloperPermissions): void {
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
