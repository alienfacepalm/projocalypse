import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useAppearance } from '@/hooks/use-appearance'
import { applyDocumentTheme, DEFAULT_APPEARANCE, loadAppearance } from '@/lib/theme'

describe('useAppearance', () => {
  afterEach(() => {
    localStorage.removeItem('projocalypse-appearance')
    localStorage.removeItem('theme')
    applyDocumentTheme(DEFAULT_APPEARANCE)
  })

  it('updates mode and persists', () => {
    const { result } = renderHook(() => useAppearance())
    act(() => {
      result.current[1]({ mode: 'dark' })
    })
    expect(result.current[0].mode).toBe('dark')
    expect(loadAppearance().mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('updates palette and applies CSS vars', () => {
    const { result } = renderHook(() => useAppearance())
    act(() => {
      result.current[1]({ palette: 'ocean' })
    })
    expect(result.current[0].palette).toBe('ocean')
    expect(loadAppearance().palette).toBe('ocean')
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#22d3ee')
  })

  it('switches to custom palette when accent changes', () => {
    const { result } = renderHook(() => useAppearance())
    act(() => {
      result.current[1]({ palette: 'custom', customAccent: '#aabbcc' })
    })
    expect(result.current[0].palette).toBe('custom')
    expect(result.current[0].customAccent).toBe('#aabbcc')
  })
})
