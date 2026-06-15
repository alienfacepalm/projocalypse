import { createContext, useContext, useMemo, type ReactNode } from 'react'
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

/** Resolved project scope: host id when embedded, otherwise route project id. */
// eslint-disable-next-line react-refresh/only-export-components
export function useScopeProjectId(routeProjectId?: string): string | null {
  const { hostProjectId } = useEmbed()
  return hostProjectId ?? routeProjectId ?? null
}
