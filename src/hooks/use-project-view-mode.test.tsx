import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useProjectViewMode } from '@/hooks/use-project-view-mode'
import { getViewMode, setViewMode } from '@/lib/utils'

describe('useProjectViewMode', () => {
  it('reads initial mode from localStorage', () => {
    setViewMode('proj-hook', 'board')
    const { result } = renderHook(() => useProjectViewMode('proj-hook'))
    expect(result.current[0]).toBe('board')
  })

  it('updates mode in state and localStorage', () => {
    const { result } = renderHook(() => useProjectViewMode('proj-update'))
    act(() => {
      result.current[1]('board')
    })
    expect(result.current[0]).toBe('board')
    expect(getViewMode('proj-update')).toBe('board')
  })
})
