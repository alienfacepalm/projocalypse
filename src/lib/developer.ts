import type { Developer } from '@/models/types'

export function developerInitials(developer: Pick<Developer, 'name' | 'initials'>): string {
  const override = developer.initials?.trim()
  if (override) return override.slice(0, 3).toUpperCase()

  const parts = developer.name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  return '?'
}

export function developerDisplayName(developer: Pick<Developer, 'name'>): string {
  return developer.name.trim() || 'Unnamed'
}
