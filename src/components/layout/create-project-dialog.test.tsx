import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateProjectDialog } from '@/components/layout/create-project-dialog'
import { ActiveDeveloperProvider } from '@/context/active-developer-context'
import { clearDb } from '@/test/db-helpers'
import { db } from '@/db/schema'
import { PROJECT_COLORS } from '@/models/types'

function renderDialog(open = true) {
  const onOpenChange = vi.fn()
  render(
    <MemoryRouter>
      <ActiveDeveloperProvider>
        <CreateProjectDialog open={open} onOpenChange={onOpenChange} />
      </ActiveDeveloperProvider>
    </MemoryRouter>,
  )
  return { onOpenChange }
}

describe('CreateProjectDialog', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('shows default color selection when opened', () => {
    renderDialog()
    const defaultSwatch = screen.getByRole('radio', { name: `Color ${PROJECT_COLORS[3]}` })
    expect(defaultSwatch).toHaveAttribute('aria-checked', 'true')
  })

  it('updates selection when a swatch is clicked', async () => {
    const user = userEvent.setup()
    renderDialog()

    const pink = screen.getByRole('radio', { name: `Color ${PROJECT_COLORS[6]}` })
    await user.click(pink)

    expect(pink).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: `Color ${PROJECT_COLORS[3]}` })).toHaveAttribute('aria-checked', 'false')
  })

  it('creates a project with the selected color', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Project name'), 'Talemail')
    await user.click(screen.getByRole('radio', { name: `Color ${PROJECT_COLORS[0]}` }))
    await user.click(screen.getByRole('button', { name: 'Create project' }))

    await waitFor(async () => {
      const project = await db.projects.filter((p) => p.name === 'Talemail').first()
      expect(project?.color).toBe(PROJECT_COLORS[0])
    })
  })
})
