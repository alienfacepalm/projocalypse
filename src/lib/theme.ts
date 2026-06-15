/** Appearance: light/dark mode + accent palette. Drives `document.documentElement` CSS variables. */

export const THEME_MODES = ['light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export const THEME_PRESET_PALETTES = [
  'glitch',
  'ocean',
  'ember',
  'slate',
  'forest',
  'plasma',
  'sunset',
  'voltage',
  'blood',
  'mint',
] as const
export type ThemePresetPalette = (typeof THEME_PRESET_PALETTES)[number]

export const THEME_PALETTES = [...THEME_PRESET_PALETTES, 'custom'] as const
export type ThemePalette = (typeof THEME_PALETTES)[number]

export const DEFAULT_CUSTOM_ACCENT = '#39ff14'
export const DEFAULT_CUSTOM_ACCENT2 = '#ff00ff'

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  dark: 'Dark',
  light: 'Light',
}

export const THEME_PALETTE_LABELS: Record<ThemePalette, string> = {
  glitch: 'Acid & magenta',
  ocean: 'Cyan & indigo',
  ember: 'Amber & rose',
  slate: 'Cool gray',
  forest: 'Lime & forest',
  plasma: 'Violet & pink',
  sunset: 'Orange & violet',
  voltage: 'Blue & gold',
  blood: 'Crimson & scarlet',
  mint: 'Mint & aqua',
  custom: 'Custom',
}

const PALETTE_ACCENTS: Record<
  ThemePresetPalette,
  { accent: string; accent2: string; accent3: string }
> = {
  glitch: { accent: '#39ff14', accent2: '#ff00ff', accent3: '#efffe3' },
  ocean: { accent: '#22d3ee', accent2: '#6366f1', accent3: '#e0f2fe' },
  ember: { accent: '#fb923c', accent2: '#f43f5e', accent3: '#ffedd5' },
  slate: { accent: '#94a3b8', accent2: '#64748b', accent3: '#e2e8f0' },
  forest: { accent: '#84cc16', accent2: '#15803d', accent3: '#ecfccb' },
  plasma: { accent: '#c084fc', accent2: '#ec4899', accent3: '#fae8ff' },
  sunset: { accent: '#fb923c', accent2: '#7c3aed', accent3: '#ffedd5' },
  voltage: { accent: '#3b82f6', accent2: '#eab308', accent3: '#dbeafe' },
  blood: { accent: '#f87171', accent2: '#b91c1c', accent3: '#fee2e2' },
  mint: { accent: '#2dd4bf', accent2: '#0ea5e9', accent3: '#ccfbf1' },
}

export interface ThemeCustomAccents {
  accent: string
  accent2: string
}

export interface AppearanceSettings {
  mode: ThemeMode
  palette: ThemePalette
  customAccent: string
  customAccent2: string
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  mode: 'light',
  palette: 'glitch',
  customAccent: DEFAULT_CUSTOM_ACCENT,
  customAccent2: DEFAULT_CUSTOM_ACCENT2,
}

const APPEARANCE_STORAGE_KEY = 'projocalypse-appearance'
const LEGACY_THEME_KEY = 'theme'

const HEX6 = /^#[0-9a-fA-F]{6}$/
const HEX8 = /^#[0-9a-fA-F]{8}$/
const HEX3 = /^#[0-9a-fA-F]{3}$/

export function coerceThemeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const t = value.trim()
  if (HEX6.test(t)) return t.toLowerCase()
  if (HEX8.test(t)) return `#${t.slice(1, 7).toLowerCase()}`
  if (HEX3.test(t)) {
    const [r, g, b] = [t[1], t[2], t[3]]
    if (!r || !g || !b) return fallback
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return fallback
}

function parseRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = coerceThemeHex(hex, '')
  if (!HEX6.test(h)) return null
  return {
    r: Number.parseInt(h.slice(1, 3), 16),
    g: Number.parseInt(h.slice(3, 5), 16),
    b: Number.parseInt(h.slice(5, 7), 16),
  }
}

function relativeLuminance(r: number, g: number, b: number): number {
  const chan = (c: number): number => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)
}

export function deriveOnAccent(accent: string): string {
  const rgb = parseRgb(accent)
  if (!rgb) return '#0a0a0a'
  return relativeLuminance(rgb.r, rgb.g, rgb.b) > 0.55 ? '#0a0a0a' : '#f2f2ec'
}

export function getResolvedAccentPair(
  palette: ThemePalette,
  custom: ThemeCustomAccents,
): { accent: string; accent2: string; accent3: string } {
  if (palette === 'custom') {
    return {
      accent: coerceThemeHex(custom.accent, DEFAULT_CUSTOM_ACCENT),
      accent2: coerceThemeHex(custom.accent2, DEFAULT_CUSTOM_ACCENT2),
      accent3: deriveCustomAccent3(coerceThemeHex(custom.accent, DEFAULT_CUSTOM_ACCENT), 'dark'),
    }
  }
  return PALETTE_ACCENTS[palette]
}

function deriveCustomAccent3(accent: string, mode: ThemeMode): string {
  const a = parseRgb(accent)
  const toward = mode === 'light' ? { r: 255, g: 255, b: 255 } : { r: 248, g: 250, b: 252 }
  if (!a) return '#e2e8f0'
  const mix = (t: number) => {
    const u = Math.min(1, Math.max(0, t))
    const r = Math.round(a.r + (toward.r - a.r) * u)
    const g = Math.round(a.g + (toward.g - a.g) * u)
    const b = Math.round(a.b + (toward.b - a.b) * u)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }
  return mix(mode === 'light' ? 0.88 : 0.82)
}

function resolveProjocalypseTokens(mode: ThemeMode, accent: string, accent2: string, accent3: string): Record<string, string> {
  const onPrimary = deriveOnAccent(accent)
  const dark = mode === 'dark'

  const neutrals = dark
    ? {
        '--color-background': '#050505',
        '--color-foreground': '#dae6d0',
        '--color-muted': '#141e11',
        '--color-muted-foreground': '#baccb0',
        '--color-border': '#27272a',
        '--color-input': '#27272a',
        '--color-secondary': '#141e11',
        '--color-secondary-foreground': '#dae6d0',
        '--color-accent': '#1a1f17',
        '--color-destructive': '#93000a',
        '--color-destructive-foreground': '#fca5a5',
        '--color-popover': '#0a0a0a',
        '--color-popover-foreground': '#dae6d0',
        '--color-card': '#0c1609',
        '--color-card-foreground': '#dae6d0',
        '--color-sidebar': '#050505',
        '--color-shadow-hard': '#000000',
        '--color-surface-weak': 'rgb(0 0 0 / 0.3)',
        '--color-surface-strong': 'rgb(0 0 0 / 0.8)',
        '--scrollbar-track': 'rgb(0 0 0 / 0.32)',
        '--scrollbar-thumb': `color-mix(in srgb, ${accent2} 78%, rgb(15 15 15))`,
        '--scrollbar-thumb-hover': `color-mix(in srgb, ${accent2} 92%, white)`,
      }
    : {
        '--color-background': '#fafafa',
        '--color-foreground': '#18181b',
        '--color-muted': '#f4f4f5',
        '--color-muted-foreground': '#71717a',
        '--color-border': '#e4e4e7',
        '--color-input': '#e4e4e7',
        '--color-secondary': '#f4f4f5',
        '--color-secondary-foreground': '#18181b',
        '--color-accent': '#f4f4f5',
        '--color-destructive': '#dc2626',
        '--color-destructive-foreground': '#fef2f2',
        '--color-popover': '#ffffff',
        '--color-popover-foreground': '#18181b',
        '--color-card': '#ffffff',
        '--color-card-foreground': '#18181b',
        '--color-sidebar': '#f5f5f5',
        '--color-shadow-hard': '#18181b',
        '--color-surface-weak': 'rgb(24 24 27 / 0.04)',
        '--color-surface-strong': 'rgb(24 24 27 / 0.08)',
        '--scrollbar-track': 'rgb(24 24 27 / 0.06)',
        '--scrollbar-thumb': `color-mix(in srgb, ${accent} 45%, #e4e4e7)`,
        '--scrollbar-thumb-hover': accent,
      }

  return {
    ...neutrals,
    '--color-primary': accent,
    '--color-primary-foreground': onPrimary,
    '--color-ring': accent2,
    '--color-accent-foreground': dark ? accent : '#18181b',
    '--color-accent2': accent2,
    '--color-accent3': accent3,
  }
}

export function resolveThemeCssVars(settings: AppearanceSettings): Record<string, string> {
  const { accent, accent2, accent3: presetAccent3 } = getResolvedAccentPair(settings.palette, {
    accent: settings.customAccent,
    accent2: settings.customAccent2,
  })
  const accent3 = settings.palette === 'custom' ? deriveCustomAccent3(accent, settings.mode) : presetAccent3
  return resolveProjocalypseTokens(settings.mode, accent, accent2, accent3)
}

export function applyDocumentTheme(settings: AppearanceSettings): void {
  const root = document.documentElement
  root.classList.toggle('dark', settings.mode === 'dark')
  root.dataset.theme = settings.mode
  root.dataset.palette = settings.palette
  const vars = resolveThemeCssVars(settings)
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

export function coerceThemeMode(value: unknown, fallback: ThemeMode): ThemeMode {
  return value === 'light' || value === 'dark' ? value : fallback
}

export function coerceThemePalette(value: unknown, fallback: ThemePalette): ThemePalette {
  if (typeof value !== 'string') return fallback
  if ((THEME_PALETTES as readonly string[]).includes(value)) return value as ThemePalette
  return fallback
}

export function normalizeAppearance(raw: unknown): AppearanceSettings {
  const base = DEFAULT_APPEARANCE
  if (!raw || typeof raw !== 'object') return { ...base }
  const o = raw as Record<string, unknown>
  return {
    mode: coerceThemeMode(o.mode, base.mode),
    palette: coerceThemePalette(o.palette, base.palette),
    customAccent: coerceThemeHex(o.customAccent, base.customAccent),
    customAccent2: coerceThemeHex(o.customAccent2, base.customAccent2),
  }
}

export function loadAppearance(): AppearanceSettings {
  try {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY)
    if (stored) {
      return normalizeAppearance(JSON.parse(stored))
    }
    const legacy = localStorage.getItem(LEGACY_THEME_KEY)
    if (legacy === 'dark' || legacy === 'light') {
      return { ...DEFAULT_APPEARANCE, mode: legacy }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_APPEARANCE }
}

export function saveAppearance(settings: AppearanceSettings): void {
  localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings))
  localStorage.setItem(LEGACY_THEME_KEY, settings.mode)
}

/** @deprecated Use loadAppearance().mode */
export function getThemeMode(): ThemeMode {
  return loadAppearance().mode
}

/** @deprecated Use saveAppearance */
export function setThemeMode(mode: ThemeMode): void {
  const current = loadAppearance()
  saveAppearance({ ...current, mode })
  applyDocumentTheme({ ...current, mode })
}

/** @deprecated Use applyDocumentTheme(loadAppearance()) */
export function applyTheme(mode: ThemeMode): void {
  const current = loadAppearance()
  applyDocumentTheme({ ...current, mode })
}
