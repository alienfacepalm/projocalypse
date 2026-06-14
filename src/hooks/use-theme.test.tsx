import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useTheme } from '@/hooks/use-theme'
import { applyTheme, getTheme, setTheme } from '@/lib/utils'

describe('useTheme', () => {
  afterEach(() => {
    localStorage.removeItem('theme')
    applyTheme('light')
  })

  it('reads initial theme from localStorage', () => {
    setTheme('dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('dark')
  })

  it('updates theme in state, localStorage, and document class', () => {
    const { result } = renderHook(() => useTheme())
    act(() => {
      result.current[1]('dark')
    })
    expect(result.current[0]).toBe('dark')
    expect(getTheme()).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
