import { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { TaskDetailPanel } from '@/components/task/task-detail-panel'
import { ActiveDeveloperProvider } from '@/context/active-developer-context'
import { ConfirmProvider } from '@/context/confirm-context'
import { TaskPanelProvider, useTaskPanel } from '@/context/task-panel-context'
import { clearDb, makeMasterDeveloper, makeProject, makeSection, makeTask } from '@/test/db-helpers'
import { db } from '@/db/schema'

function OpenTaskOnMount({ taskId }: { taskId: string }) {
  const { openTask } = useTaskPanel()
  useEffect(() => {
    openTask(taskId)
  }, [openTask, taskId])
  return null
}

function renderOpenPanel(taskId: string) {
  render(
    <MemoryRouter>
      <ConfirmProvider>
        <ActiveDeveloperProvider>
          <TaskPanelProvider>
            <OpenTaskOnMount taskId={taskId} />
            <TaskDetailPanel />
          </TaskPanelProvider>
        </ActiveDeveloperProvider>
      </ConfirmProvider>
    </MemoryRouter>,
  )
}

describe('TaskDetailPanel', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('exposes an accessible dialog title before task content loads', async () => {
    renderOpenPanel('missing-task')

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Task details')
  })

  it('renders task form when the task exists', async () => {
    const project = makeProject({ id: 'proj-1' })
    const section = makeSection({ id: 'section-1', projectId: 'proj-1' })
    const task = makeTask({ id: 'task-1', projectId: 'proj-1', sectionId: 'section-1', title: 'Ship fix' })
    await db.projects.add(project)
    await db.sections.add(section)
    await db.tasks.add(task)
    await db.developers.add(makeMasterDeveloper({ id: 'dev-1', projectId: 'proj-1' }))

    renderOpenPanel('task-1')

    expect(await screen.findByDisplayValue('Ship fix')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Task details')
  })
})
