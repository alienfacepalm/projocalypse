import { useCallback, useState } from 'react'
import {
  applyDocumentTheme,
  loadAppearance,
  saveAppearance,
  type AppearanceSettings,
  type ThemeMode,
  type ThemePalette,
} from '@/lib/theme'

export function useAppearance(): [AppearanceSettings, (patch: Partial<AppearanceSettings>) => void] {
  const [settings, setSettings] = useState<AppearanceSettings>(() => loadAppearance())

  const update = useCallback((patch: Partial<AppearanceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveAppearance(next)
      applyDocumentTheme(next)
      return next
    })
  }, [])

  return [settings, update]
}

export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
  const [settings, update] = useAppearance()
  return [settings.mode, (mode) => update({ mode })]
}

export function useThemePalette(): [ThemePalette, (palette: ThemePalette) => void] {
  const [settings, update] = useAppearance()
  return [settings.palette, (palette) => update({ palette })]
}
