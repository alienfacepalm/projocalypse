import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { QuickAddTask } from '@/components/task/quick-add-task'
import { clearDb } from '@/test/db-helpers'
import { createProject } from '@/db/operations'
import { db } from '@/db/schema'

describe('QuickAddTask', () => {
  let projectId: string
  let sectionId: string

  beforeEach(async () => {
    await clearDb()
    const project = await createProject('Test', '#4573D2')
    projectId = project.id
    const section = await db.sections.where('projectId').equals(project.id).first()
    sectionId = section!.id
  })

  it('creates a task on Enter', async () => {
    const user = userEvent.setup()
    render(<QuickAddTask projectId={projectId} sectionId={sectionId} />)

    const input = screen.getByPlaceholderText('Add task…')
    await user.type(input, 'New task{Enter}')

    await waitFor(async () => {
      const tasks = await db.tasks.where('sectionId').equals(sectionId).toArray()
      expect(tasks.some((t) => t.title === 'New task')).toBe(true)
    })
    expect(input).toHaveValue('')
  })

  it('ignores blank submissions', async () => {
    const user = userEvent.setup()
    render(<QuickAddTask projectId={projectId} sectionId={sectionId} />)

    const input = screen.getByPlaceholderText('Add task…')
    await user.type(input, '   {Enter}')

    expect(await db.tasks.where('sectionId').equals(sectionId).count()).toBe(0)
  })

  it('uses custom placeholder', () => {
    render(<QuickAddTask projectId={projectId} sectionId={sectionId} placeholder="Quick add…" />)
    expect(screen.getByPlaceholderText('Quick add…')).toBeInTheDocument()
  })
})
