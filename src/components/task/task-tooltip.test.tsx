import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TaskTooltipContent } from '@/components/task/task-tooltip'
import type { Task } from '@/models/types'

const task: Task = {
  id: 'task-1',
  projectId: 'project-1',
  sectionId: 'section-1',
  title: 'Review HUD glass tooltip',
  description: 'Match Tabocalypse hover previews with blur and hard shadows.',
  completed: false,
  dueDate: new Date('2026-06-20T12:00:00').getTime(),
  priority: 'medium',
  assigneeId: null,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
  completedAt: null,
}

describe('TaskTooltipContent', () => {
  it('renders title, description snippet, and metadata rows', () => {
    render(
      <TaskTooltipContent
        task={task}
        meta={{ projectName: 'Ops', sectionName: 'Backlog' }}
      />,
    )

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText('Review HUD glass tooltip')).toBeInTheDocument()
    expect(screen.getByText(/Match Tabocalypse hover previews/)).toBeInTheDocument()
    expect(screen.getByText('Ops')).toBeInTheDocument()
    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })
})
