import { useContext } from 'react'
import { createContext, useState, type ReactNode } from 'react'

interface TaskPanelContextValue {
  selectedTaskId: string | null
  openTask: (taskId: string) => void
  closeTask: () => void
}

const TaskPanelContext = createContext<TaskPanelContextValue | null>(null)

export function TaskPanelProvider({ children }: { children: ReactNode }) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  return (
    <TaskPanelContext.Provider
      value={{
        selectedTaskId,
        openTask: setSelectedTaskId,
        closeTask: () => setSelectedTaskId(null),
      }}
    >
      {children}
    </TaskPanelContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTaskPanel() {
  const ctx = useContext(TaskPanelContext)
  if (!ctx) throw new Error('useTaskPanel must be used within TaskPanelProvider')
  return ctx
}
