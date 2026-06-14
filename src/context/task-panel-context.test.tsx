import type { ReactNode } from 'react'
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TaskPanelProvider, useTaskPanel } from '@/context/task-panel-context'

function wrapper({ children }: { children: ReactNode }) {
  return <TaskPanelProvider>{children}</TaskPanelProvider>
}

describe('useTaskPanel', () => {
  it('opens and closes the selected task', () => {
    const { result } = renderHook(() => useTaskPanel(), { wrapper })
    expect(result.current.selectedTaskId).toBeNull()

    act(() => {
      result.current.openTask('task-42')
    })
    expect(result.current.selectedTaskId).toBe('task-42')

    act(() => {
      result.current.closeTask()
    })
    expect(result.current.selectedTaskId).toBeNull()
  })

  it('throws outside provider', () => {
    expect(() => renderHook(() => useTaskPanel())).toThrow(/TaskPanelProvider/)
  })
})
