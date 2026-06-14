import { useState } from 'react'
import type { ViewMode } from '@/models/types'
import { getViewMode, setViewMode } from '@/lib/utils'

export function useProjectViewMode(projectId: string): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => getViewMode(projectId))

  function update(mode: ViewMode) {
    setViewMode(projectId, mode)
    setViewModeState(mode)
  }

  return [viewMode, update]
}
