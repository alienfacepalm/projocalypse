import { type ReactNode } from 'react'
import { renderHook } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { EmbedProvider, useRouteProjectId, useScopeProjectId } from '@/context/embed-context'

function renderScopeHook(
  initialPath: string,
  embed?: { hostProjectId?: string | null },
  insideRoute = false,
) {
  const wrapper = ({ children }: { children: ReactNode }) => {
    const inner = (
      <EmbedProvider config={{ embedded: true, hostProjectId: embed?.hostProjectId ?? null }}>
        {children}
      </EmbedProvider>
    )

    if (insideRoute) {
      return (
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/project/:projectId" element={inner} />
          </Routes>
        </MemoryRouter>
      )
    }

    return <MemoryRouter initialEntries={[initialPath]}>{inner}</MemoryRouter>
  }

  return renderHook(
    () => ({
      routeProjectId: useRouteProjectId(),
      scopeProjectId: useScopeProjectId(useRouteProjectId()),
    }),
    { wrapper },
  )
}

describe('useRouteProjectId', () => {
  it('parses project id from pathname when provider is above Routes', () => {
    const { result } = renderScopeHook('/project/from-path', undefined, false)
    expect(result.current.routeProjectId).toBe('from-path')
  })

  it('reads project id from route params when inside a Route', () => {
    const { result } = renderScopeHook('/project/from-params', undefined, true)
    expect(result.current.routeProjectId).toBe('from-params')
  })

  it('returns undefined on non-project paths', () => {
    const { result } = renderScopeHook('/my-tasks', undefined, false)
    expect(result.current.routeProjectId).toBeUndefined()
  })
})

describe('useScopeProjectId', () => {
  it('prefers hostProjectId over route id when embedded', () => {
    const { result } = renderScopeHook('/project/route-id', { hostProjectId: 'host-id' }, false)
    expect(result.current.scopeProjectId).toBe('host-id')
  })

  it('falls back to route id when hostProjectId is absent', () => {
    const { result } = renderScopeHook('/project/route-only', { hostProjectId: null }, false)
    expect(result.current.scopeProjectId).toBe('route-only')
  })
})
