import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_APPEARANCE,
  applyDocumentTheme,
  getResolvedAccentPair,
  loadAppearance,
  normalizeAppearance,
  resolveThemeCssVars,
  saveAppearance,
  type AppearanceSettings,
} from '@/lib/theme'

const STORAGE_KEY = 'projocalypse-appearance'

function clearAppearanceStorage() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem('theme')
}

describe('theme palettes', () => {
  it('resolves glitch preset accents', () => {
    const pair = getResolvedAccentPair('glitch', {
      accent: '#000000',
      accent2: '#111111',
    })
    expect(pair.accent).toBe('#39ff14')
    expect(pair.accent2).toBe('#ff00ff')
  })

  it('uses custom accents when palette is custom', () => {
    const pair = getResolvedAccentPair('custom', {
      accent: '#112233',
      accent2: '#445566',
    })
    expect(pair.accent).toBe('#112233')
    expect(pair.accent2).toBe('#445566')
  })

  it('maps primary and ring tokens from accents', () => {
    const vars = resolveThemeCssVars({ ...DEFAULT_APPEARANCE, mode: 'dark', palette: 'ocean' })
    expect(vars['--color-primary']).toBe('#22d3ee')
    expect(vars['--color-ring']).toBe('#6366f1')
    expect(vars['--color-accent2']).toBe('#6366f1')
  })

  it('uses white and zinc neutrals for light mode', () => {
    const vars = resolveThemeCssVars(DEFAULT_APPEARANCE)
    expect(vars['--color-background']).toBe('#fafafa')
    expect(vars['--color-card']).toBe('#ffffff')
    expect(vars['--color-sidebar']).toBe('#f5f5f5')
    expect(vars['--color-foreground']).toBe('#18181b')
    expect(vars['--color-accent-foreground']).toBe('#18181b')
    expect(vars['--color-primary']).toBe('#39ff14')
  })
})

describe('appearance persistence', () => {
  afterEach(() => {
    clearAppearanceStorage()
    applyDocumentTheme(DEFAULT_APPEARANCE)
  })

  it('defaults to light glitch', () => {
    expect(loadAppearance()).toEqual(DEFAULT_APPEARANCE)
  })

  it('persists appearance settings', () => {
    const custom: AppearanceSettings = {
      mode: 'dark',
      palette: 'ember',
      customAccent: '#39ff14',
      customAccent2: '#ff00ff',
    }
    saveAppearance(custom)
    expect(loadAppearance()).toEqual(custom)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('migrates legacy theme key', () => {
    localStorage.setItem('theme', 'dark')
    expect(loadAppearance().mode).toBe('dark')
  })

  it('applies dark class and data attributes', () => {
    applyDocumentTheme({ ...DEFAULT_APPEARANCE, mode: 'dark', palette: 'plasma' })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.palette).toBe('plasma')
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#c084fc')
  })

  it('applies light mode without dark class and sets light neutrals', () => {
    applyDocumentTheme({ ...DEFAULT_APPEARANCE, mode: 'dark' })
    applyDocumentTheme(DEFAULT_APPEARANCE)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.getPropertyValue('--color-background')).toBe('#fafafa')
    expect(document.documentElement.style.getPropertyValue('--color-card')).toBe('#ffffff')
  })

  it('normalizes invalid stored values', () => {
    expect(
      normalizeAppearance({ mode: 'invalid', palette: 'nope', customAccent: 'bad' }),
    ).toEqual({
      mode: 'light',
      palette: 'glitch',
      customAccent: DEFAULT_APPEARANCE.customAccent,
      customAccent2: DEFAULT_APPEARANCE.customAccent2,
    })
  })
})
