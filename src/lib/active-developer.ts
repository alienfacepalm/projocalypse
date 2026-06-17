const ACTIVE_DEVELOPER_KEY_PREFIX = 'projocalypse-active-developer'

export function activeDeveloperStorageKey(projectId: string): string {
  return `${ACTIVE_DEVELOPER_KEY_PREFIX}:${projectId}`
}

export function loadActiveDeveloperId(projectId: string): string | null {
  try {
    const value = localStorage.getItem(activeDeveloperStorageKey(projectId))
    return value && value.trim() ? value : null
  } catch {
    return null
  }
}

export function saveActiveDeveloperId(projectId: string, id: string): void {
  localStorage.setItem(activeDeveloperStorageKey(projectId), id)
}

export function clearActiveDeveloperId(projectId: string): void {
  localStorage.removeItem(activeDeveloperStorageKey(projectId))
}

/** @deprecated Use clearActiveDeveloperId per project. Clears legacy workspace key. */
export function clearLegacyWorkspaceActiveDeveloperId(): void {
  localStorage.removeItem('projocalypse-active-developer-id')
}
