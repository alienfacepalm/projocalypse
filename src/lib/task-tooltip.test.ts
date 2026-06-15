import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTaskTooltipDetails, formatSubtaskSummary, truncateDescription } from '@/lib/task-tooltip'
import type { Task } from '@/models/types'

const baseTask: Pick<Task, 'title' | 'description' | 'completed' | 'dueDate' | 'priority'> = {
  title: 'Ship tooltips',
  description: '  Add glass hover previews for tasks across board, list, and my tasks. ',
  completed: false,
  dueDate: new Date('2026-06-14T12:00:00').getTime(),
  priority: 'high',
}

describe('truncateDescription', () => {
  it('trims whitespace and truncates long copy', () => {
    expect(truncateDescription('  hello world  ')).toBe('hello world')
    expect(truncateDescription('x'.repeat(130), 120)).toHaveLength(120)
    expect(truncateDescription('x'.repeat(130), 120).endsWith('…')).toBe(true)
  })

  it('returns empty string for blank descriptions', () => {
    expect(truncateDescription('   ')).toBe('')
  })
})

describe('formatSubtaskSummary', () => {
  it('formats subtask counts', () => {
    expect(formatSubtaskSummary(3, 1)).toBe('1/3 subtasks')
    expect(formatSubtaskSummary(1, 0)).toBe('0/1 subtask')
    expect(formatSubtaskSummary(0, 0)).toBeNull()
  })
})

describe('buildTaskTooltipDetails', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('includes status, priority, due date, and context metadata', () => {
    const result = buildTaskTooltipDetails(baseTask, {
      projectName: 'Projocalypse',
      sectionName: 'Inbox',
      subtaskCount: 2,
      subtaskCompleted: 1,
    })

    expect(result.title).toBe('Ship tooltips')
    expect(result.description).toContain('glass hover previews')
    expect(result.details).toEqual(
      expect.arrayContaining([
        { label: 'Status', value: 'Open' },
        { label: 'Priority', value: 'High' },
        { label: 'Due', value: 'Today' },
        { label: 'Section', value: 'Inbox' },
        { label: 'Project', value: 'Projocalypse' },
        { label: 'Subtasks', value: '1/2 subtasks' },
      ]),
    )
  })

  it('omits optional fields when absent', () => {
    const result = buildTaskTooltipDetails({
      ...baseTask,
      priority: 'none',
      dueDate: null,
      description: '',
    })

    expect(result.description).toBeNull()
    expect(result.details.map((detail) => detail.label)).toEqual(['Status'])
  })
})
