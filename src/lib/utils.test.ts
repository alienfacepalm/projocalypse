import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyTheme,
  dueDateClass,
  formatDueDate,
  getTheme,
  getViewMode,
  priorityColor,
  priorityLabel,
  setTheme,
  setViewMode,
} from '@/lib/utils'

describe('formatDueDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty string for null', () => {
    expect(formatDueDate(null)).toBe('')
  })

  it('returns Today for same-day timestamps', () => {
    expect(formatDueDate(new Date('2026-06-14T08:00:00').getTime())).toBe('Today')
  })

  it('formats other dates', () => {
    expect(formatDueDate(new Date('2026-07-04T08:00:00').getTime())).toBe('Jul 4')
  })
})

describe('dueDateClass', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns muted for null or completed', () => {
    expect(dueDateClass(null, false)).toBe('text-muted-foreground')
    expect(dueDateClass(Date.now(), true)).toBe('text-muted-foreground')
  })

  it('returns red for overdue dates', () => {
    expect(dueDateClass(new Date('2026-06-10').getTime(), false)).toBe('text-red-600')
  })

  it('returns amber for today', () => {
    expect(dueDateClass(new Date('2026-06-14T08:00:00').getTime(), false)).toBe('text-amber-600')
  })
})

describe('priority helpers', () => {
  it('maps priority to color classes', () => {
    expect(priorityColor('low')).toBe('bg-gray-400')
    expect(priorityColor('medium')).toBe('bg-amber-400')
    expect(priorityColor('high')).toBe('bg-red-500')
    expect(priorityColor('none')).toBe('bg-transparent')
  })

  it('maps priority to labels', () => {
    expect(priorityLabel('low')).toBe('Low')
    expect(priorityLabel('medium')).toBe('Medium')
    expect(priorityLabel('high')).toBe('High')
    expect(priorityLabel('none')).toBe('None')
  })
})

describe('view mode persistence', () => {
  it('defaults to list', () => {
    expect(getViewMode('proj-1')).toBe('list')
  })

  it('persists board mode per project', () => {
    setViewMode('proj-1', 'board')
    expect(getViewMode('proj-1')).toBe('board')
    expect(getViewMode('proj-2')).toBe('list')
  })
})

describe('theme persistence', () => {
  afterEach(() => {
    localStorage.removeItem('theme')
    applyTheme('light')
  })

  it('defaults to light', () => {
    expect(getTheme()).toBe('light')
  })

  it('persists dark mode', () => {
    setTheme('dark')
    expect(getTheme()).toBe('dark')
  })

  it('applies dark class on documentElement', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
