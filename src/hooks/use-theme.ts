import { useState } from 'react'
import { applyTheme, getTheme, setTheme, type Theme } from '@/lib/utils'

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => getTheme())

  function update(next: Theme) {
    setTheme(next)
    applyTheme(next)
    setThemeState(next)
  }

  return [theme, update]
}
