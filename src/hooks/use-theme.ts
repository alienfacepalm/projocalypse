import { useState } from 'react'
import { type ThemeMode, loadAppearance, saveAppearance, applyDocumentTheme } from '@/lib/theme'

export type Theme = ThemeMode

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [mode, setModeState] = useState<ThemeMode>(() => loadAppearance().mode)

  function update(next: ThemeMode) {
    const current = loadAppearance()
    const nextSettings = { ...current, mode: next }
    saveAppearance(nextSettings)
    applyDocumentTheme(nextSettings)
    setModeState(next)
  }

  return [mode, update]
}
