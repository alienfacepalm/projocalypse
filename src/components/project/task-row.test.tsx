import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useLiveQuery } from 'dexie-react-hooks'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { TaskRow } from '@/components/project/task-row'
import { TaskPanelProvider } from '@/context/task-panel-context'
import { TooltipProvider } from '@/components/ui/tooltip'
import { clearDb, makeProject, makeSection, makeTask } from '@/test/db-helpers'
import { db } from '@/db/schema'

function SortableTaskRowHarness({ taskId, sectionName }: { taskId: string; sectionName: string }) {
  const task = useLiveQuery(() => db.tasks.get(taskId), [taskId])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  if (!task) return null

  return (
    <DndContext sensors={sensors}>
      <SortableContext items={[task.id]} strategy={verticalListSortingStrategy}>
        <TaskRow task={task} sectionName={sectionName} />
      </SortableContext>
    </DndContext>
  )
}

describe('TaskRow', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('toggles task completion when the checkbox is clicked inside a sortable context', async () => {
    const user = userEvent.setup()
    const project = makeProject({ id: 'proj-1' })
    const section = makeSection({ id: 'section-1', projectId: 'proj-1', name: 'Backlog' })
    const task = makeTask({
      id: 'task-1',
      projectId: 'proj-1',
      sectionId: 'section-1',
      title: 'S0-03 Wire checkbox',
      completed: false,
    })
    await db.projects.add(project)
    await db.sections.add(section)
    await db.tasks.add(task)

    render(
      <MemoryRouter>
        <TooltipProvider delayDuration={0}>
          <TaskPanelProvider>
            <SortableTaskRowHarness taskId="task-1" sectionName={section.name} />
          </TaskPanelProvider>
        </TooltipProvider>
      </MemoryRouter>,
    )

    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    await user.click(checkbox)

    await waitFor(async () => {
      const stored = await db.tasks.get('task-1')
      expect(stored?.completed).toBe(true)
    })
    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeChecked()
    })
  })
})
