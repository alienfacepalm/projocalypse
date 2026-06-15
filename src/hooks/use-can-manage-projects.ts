import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useActiveDeveloper } from '@/context/active-developer-context'
import { hasPermission } from '@/lib/permissions'

export function useCanManageProjects(): boolean {
  const { activeDeveloper, can } = useActiveDeveloper()
  const developers = useLiveQuery(() => db.developers.toArray(), [])

  if (developers === undefined) return false
  if (developers.length === 0) return true
  if (activeDeveloper) return can('manageProjects')
  return developers.some((developer) => hasPermission(developer, 'manageProjects'))
}
