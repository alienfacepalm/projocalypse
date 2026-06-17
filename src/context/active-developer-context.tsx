import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { bootstrapMasterDeveloper } from '@/db/operations'
import { useRouteProjectId, useScopeProjectId } from '@/context/embed-context'
import {
  clearActiveDeveloperId,
  clearLegacyWorkspaceActiveDeveloperId,
  loadActiveDeveloperId,
  saveActiveDeveloperId,
} from '@/lib/active-developer'
import { hasPermission } from '@/lib/permissions'
import type { Developer, DeveloperPermissions } from '@/models/types'

type ActiveDeveloperContextValue = {
  scopeProjectId: string | null
  activeDeveloper: Developer | undefined
  loading: boolean
  needsBootstrap: boolean
  setActiveDeveloperId: (id: string) => void
  bootstrap: (name: string) => Promise<Developer>
  can: (permission: keyof DeveloperPermissions) => boolean
  actorForProject: (projectId: string) => Developer | undefined
}

const ActiveDeveloperContext = createContext<ActiveDeveloperContextValue | null>(null)

function pickDefaultDeveloper(roster: Developer[], projectId: string): Developer | undefined {
  const stored = loadActiveDeveloperId(projectId)
  if (stored) {
    const match = roster.find((developer) => developer.id === stored)
    if (match) return match
  }
  return roster.find((developer) => developer.role === 'master') ?? roster[0]
}

export function ActiveDeveloperProvider({ children }: { children: ReactNode }) {
  const routeProjectId = useRouteProjectId()
  const scopeProjectId = useScopeProjectId(routeProjectId)
  const [manualPick, setManualPick] = useState<{ projectId: string; id: string } | null>(null)

  useEffect(() => {
    clearLegacyWorkspaceActiveDeveloperId()
  }, [])

  const developers = useLiveQuery(
    () =>
      scopeProjectId
        ? db.developers.where('projectId').equals(scopeProjectId).sortBy('sortOrder')
        : [],
    [scopeProjectId],
  )

  const activeId = useMemo(() => {
    if (!scopeProjectId || developers === undefined) return null

    const roster = developers
    if (roster.length === 0) return null

    if (
      manualPick?.projectId === scopeProjectId &&
      roster.some((developer) => developer.id === manualPick.id)
    ) {
      return manualPick.id
    }

    const stored = loadActiveDeveloperId(scopeProjectId)
    if (stored && roster.some((developer) => developer.id === stored)) {
      return stored
    }

    const fallback = roster.find((developer) => developer.role === 'master') ?? roster[0]
    return fallback?.id ?? null
  }, [scopeProjectId, developers, manualPick])

  useEffect(() => {
    if (activeId && scopeProjectId) {
      saveActiveDeveloperId(scopeProjectId, activeId)
    }
  }, [activeId, scopeProjectId])

  const activeDeveloper = useLiveQuery(
    () => (activeId ? db.developers.get(activeId) : undefined),
    [activeId],
  )

  const needsBootstrap =
    scopeProjectId !== null && developers !== undefined && developers.length === 0
  const resolvingActiveDeveloper =
    scopeProjectId !== null && activeId !== null && activeDeveloper === undefined
  const loading =
    scopeProjectId !== null &&
    (developers === undefined || resolvingActiveDeveloper)

  const setActiveDeveloperId = useCallback(
    (id: string) => {
      if (!scopeProjectId) return
      setManualPick({ projectId: scopeProjectId, id })
      saveActiveDeveloperId(scopeProjectId, id)
    },
    [scopeProjectId],
  )

  const bootstrap = useCallback(
    async (name: string) => {
      if (!scopeProjectId) {
        throw new Error('Cannot bootstrap without a project scope.')
      }
      const developer = await bootstrapMasterDeveloper(scopeProjectId, name)
      setActiveDeveloperId(developer.id)
      return developer
    },
    [scopeProjectId, setActiveDeveloperId],
  )

  const can = useCallback(
    (permission: keyof DeveloperPermissions) => {
      if (!activeDeveloper || activeDeveloper.projectId !== scopeProjectId) return false
      return hasPermission(activeDeveloper, permission)
    },
    [activeDeveloper, scopeProjectId],
  )

  const allDevelopers = useLiveQuery(() => db.developers.toArray(), [])

  const actorForProject = useCallback(
    (projectId: string): Developer | undefined => {
      const roster = (allDevelopers ?? []).filter((developer) => developer.projectId === projectId)
      if (roster.length === 0) return undefined
      if (scopeProjectId === projectId && activeDeveloper?.projectId === projectId) {
        return activeDeveloper
      }
      return pickDefaultDeveloper(roster, projectId)
    },
    [allDevelopers, scopeProjectId, activeDeveloper],
  )

  const value = useMemo(
    () => ({
      scopeProjectId,
      activeDeveloper:
        activeDeveloper?.projectId === scopeProjectId ? activeDeveloper : undefined,
      loading,
      needsBootstrap,
      setActiveDeveloperId,
      bootstrap,
      can,
      actorForProject,
    }),
    [
      scopeProjectId,
      activeDeveloper,
      loading,
      needsBootstrap,
      setActiveDeveloperId,
      bootstrap,
      can,
      actorForProject,
    ],
  )

  return <ActiveDeveloperContext.Provider value={value}>{children}</ActiveDeveloperContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActiveDeveloper(): ActiveDeveloperContextValue {
  const context = useContext(ActiveDeveloperContext)
  if (!context) {
    throw new Error('useActiveDeveloper must be used within ActiveDeveloperProvider')
  }
  return context
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRequireActiveDeveloper(): Developer {
  const { activeDeveloper } = useActiveDeveloper()
  if (!activeDeveloper) {
    throw new Error('No active developer selected')
  }
  return activeDeveloper
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProjectActor(projectId: string): Developer | undefined {
  const { actorForProject } = useActiveDeveloper()
  return actorForProject(projectId)
}

// eslint-disable-next-line react-refresh/only-export-components
export function resetActiveDeveloperSession(projectId: string): void {
  clearActiveDeveloperId(projectId)
}
