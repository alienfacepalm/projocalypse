import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmProvider, useConfirm } from '@/context/confirm-context'

function ConfirmHarness({
  onConfirmResult,
  onPromptResult,
}: {
  onConfirmResult: (value: boolean) => void
  onPromptResult: (value: string | null) => void
}) {
  const { confirm, alert, prompt } = useConfirm()
  const [alertSeen, setAlertSeen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const ok = await confirm({
            title: 'Delete item',
            description: 'This cannot be undone.',
            confirmLabel: 'Delete',
            variant: 'destructive',
          })
          onConfirmResult(ok)
        }}
      >
        Open confirm
      </button>
      <button
        type="button"
        onClick={async () => {
          await alert({ title: 'Sync failed', description: 'Network error', variant: 'error' })
          setAlertSeen(true)
        }}
      >
        Open alert
      </button>
      <button
        type="button"
        onClick={async () => {
          const value = await prompt({
            title: 'New section',
            label: 'Section name',
            confirmLabel: 'Add section',
          })
          onPromptResult(value)
        }}
      >
        Open prompt
      </button>
      {alertSeen && <span>Alert dismissed</span>}
    </div>
  )
}

function renderHarness() {
  const onConfirmResult = vi.fn()
  const onPromptResult = vi.fn()
  render(
    <ConfirmProvider>
      <ConfirmHarness onConfirmResult={onConfirmResult} onPromptResult={onPromptResult} />
    </ConfirmProvider>,
  )
  return { onConfirmResult, onPromptResult }
}

describe('ConfirmProvider', () => {
  it('resolves confirm with true when confirmed', async () => {
    const user = userEvent.setup()
    const { onConfirmResult } = renderHarness()

    await user.click(screen.getByRole('button', { name: 'Open confirm' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Delete item')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onConfirmResult).toHaveBeenCalledWith(true))
  })

  it('resolves confirm with false when cancelled', async () => {
    const user = userEvent.setup()
    const { onConfirmResult } = renderHarness()

    await user.click(screen.getByRole('button', { name: 'Open confirm' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(onConfirmResult).toHaveBeenCalledWith(false))
  })

  it('dismisses alert with OK', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'Open alert' }))
    expect(screen.getByText('Sync failed')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'OK' }))
    await waitFor(() => expect(screen.getByText('Alert dismissed')).toBeInTheDocument())
  })

  it('resolves prompt with trimmed value on submit', async () => {
    const user = userEvent.setup()
    const { onPromptResult } = renderHarness()

    await user.click(screen.getByRole('button', { name: 'Open prompt' }))
    await user.type(screen.getByLabelText('Section name'), '  Backlog  ')
    await user.click(screen.getByRole('button', { name: 'Add section' }))
    await waitFor(() => expect(onPromptResult).toHaveBeenCalledWith('Backlog'))
  })

  it('resolves prompt with null when cancelled', async () => {
    const user = userEvent.setup()
    const { onPromptResult } = renderHarness()

    await user.click(screen.getByRole('button', { name: 'Open prompt' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(onPromptResult).toHaveBeenCalledWith(null))
  })
})
