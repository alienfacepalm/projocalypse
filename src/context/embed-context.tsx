import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { type EmbedConfig, STANDALONE_EMBED_CONFIG, mergeEmbedConfig } from '@/lib/embed'

const EmbedContext = createContext<EmbedConfig>(STANDALONE_EMBED_CONFIG)

export function EmbedProvider({
  children,
  config,
}: {
  children: ReactNode
  config?: Partial<EmbedConfig>
}) {
  const value = useMemo(() => mergeEmbedConfig(config), [config])
  return <EmbedContext.Provider value={value}>{children}</EmbedContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEmbed(): EmbedConfig {
  return useContext(EmbedContext)
}

/**
 * Project id from the current URL. Works when the caller sits above `<Routes>`
 * (e.g. `ActiveDeveloperProvider` in `App.tsx`) by parsing `/project/:id`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useRouteProjectId(): string | undefined {
  const { projectId } = useParams<{ projectId?: string }>()
  const { pathname } = useLocation()
  if (projectId) return projectId
  const match = /^\/project\/([^/]+)/.exec(pathname)
  return match?.[1]
}

/** Resolved project scope: host id when embedded, otherwise route project id. */
// eslint-disable-next-line react-refresh/only-export-components
export function useScopeProjectId(routeProjectId?: string): string | null {
  const { hostProjectId } = useEmbed()
  return hostProjectId ?? routeProjectId ?? null
}
