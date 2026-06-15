import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isPast, isToday, startOfDay } from 'date-fns'
import type { Priority } from '@/models/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDueDate(timestamp: number | null): string {
  if (timestamp === null) return ''
  const date = new Date(timestamp)
  if (isToday(date)) return 'Today'
  return format(date, 'MMM d')
}

export function dueDateClass(timestamp: number | null, completed: boolean): string {
  if (timestamp === null || completed) return 'text-muted-foreground'
  const date = startOfDay(new Date(timestamp))
  const today = startOfDay(new Date())
  if (isPast(date) && date < today) return 'text-red-600'
  if (isToday(new Date(timestamp))) return 'text-amber-600'
  return 'text-muted-foreground'
}

export function priorityColor(priority: Priority): string {
  switch (priority) {
    case 'low':
      return 'bg-gray-400'
    case 'medium':
      return 'bg-amber-400'
    case 'high':
      return 'bg-red-500'
    default:
      return 'bg-transparent'
  }
}

export function priorityLabel(priority: Priority): string {
  switch (priority) {
    case 'low':
      return 'Low'
    case 'medium':
      return 'Medium'
    case 'high':
      return 'High'
    default:
      return 'None'
  }
}

export type Theme = 'light' | 'dark'

export { applyTheme, getThemeMode as getTheme, setThemeMode as setTheme } from '@/lib/theme'

export function getViewMode(projectId: string): 'list' | 'board' {
  return localStorage.getItem(`view-mode-${projectId}`) === 'board' ? 'board' : 'list'
}

export function setViewMode(projectId: string, mode: 'list' | 'board'): void {
  localStorage.setItem(`view-mode-${projectId}`, mode)
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
