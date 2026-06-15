import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { MyTasksView } from '@/components/my-tasks/my-tasks-view'
import { TaskPanelProvider } from '@/context/task-panel-context'
import { TooltipProvider } from '@/components/ui/tooltip'
import { clearDb, makeProject, makeSection, makeTask } from '@/test/db-helpers'
import { db } from '@/db/schema'

function renderMyTasks() {
  render(
    <MemoryRouter>
      <TooltipProvider delayDuration={0}>
        <TaskPanelProvider>
          <MyTasksView />
        </TaskPanelProvider>
      </TooltipProvider>
    </MemoryRouter>,
  )
}

describe('MyTasksView', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('renders smart lists and filter controls', async () => {
    renderMyTasks()

    expect(await screen.findByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upcoming' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overdue' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('All projects')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Any priority')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Any assignee')).toBeInTheDocument()
  })

  it('shows task preview tooltip on hover', async () => {
    const user = userEvent.setup()
    const project = makeProject({ id: 'p1', name: 'Ops' })
    const section = makeSection({ id: 's1', projectId: 'p1' })
    const task = makeTask({
      id: 't1',
      projectId: 'p1',
      sectionId: 's1',
      title: 'Ship tooltip fix',
      description: 'Hover should preview this task.',
    })
    await db.projects.add(project)
    await db.sections.add(section)
    await db.tasks.add(task)

    renderMyTasks()

    expect(await screen.findByText('Ship tooltip fix')).toBeInTheDocument()
    await user.hover(screen.getByRole('button', { name: 'Ship tooltip fix' }))

    expect(screen.getAllByText('Hover should preview this task.').length).toBeGreaterThanOrEqual(1)
  })
})
