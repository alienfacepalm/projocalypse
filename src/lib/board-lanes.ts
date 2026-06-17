import type { Section, Task } from '@/models/types'

export type BoardLane = 'todo' | 'in_progress' | 'done'

export interface BoardLaneMeta {
  id: BoardLane
  label: string
  shortLabel: string
  description: string
}

export const BOARD_LANES: BoardLaneMeta[] = [
  {
    id: 'todo',
    label: 'Not started',
    shortLabel: 'To do',
    description: 'Backlog and upcoming work',
  },
  {
    id: 'in_progress',
    label: 'In progress',
    shortLabel: 'Active',
    description: 'Work being done right now',
  },
  {
    id: 'done',
    label: 'Shipped',
    shortLabel: 'Done',
    description: 'Completed and delivered',
  },
]

const DONE_NAME =
  /^(done|shipped|complete|completed|closed|archived|delivered|released)(?:\s|$)/i
const IN_PROGRESS_NAME =
  /^(in progress|in-progress|wip|doing|active|current|working)(?:\s|$)/i

/** Classifies a section name into a workflow lane (for board grouping). */
export function inferSectionLane(name: string): BoardLane {
  const trimmed = name.trim()
  if (DONE_NAME.test(trimmed) || /\bshipped\b/i.test(trimmed)) return 'done'
  if (IN_PROGRESS_NAME.test(trimmed) || /\bin progress\b/i.test(trimmed)) return 'in_progress'
  return 'todo'
}

/** Resolves which board lane a task appears in. */
export function resolveTaskLane(task: Task, section: Section | undefined): BoardLane {
  if (task.completed) return 'done'
  if (section) return inferSectionLane(section.name)
  return 'todo'
}

const CANONICAL_NAME_PRIORITY: Record<BoardLane, string[]> = {
  todo: ['to do', 'todo', 'backlog', 'not started'],
  in_progress: ['in progress', 'in-progress', 'wip', 'doing', 'active'],
  done: ['shipped', 'done', 'complete', 'completed'],
}

/** Picks the best section to represent a lane when moving or adding tasks. */
export function pickCanonicalSection(sections: Section[], lane: BoardLane): Section | undefined {
  if (sections.length === 0) return undefined

  const inLane = sections.filter((section) => inferSectionLane(section.name) === lane)
  if (inLane.length === 0) {
    if (lane === 'todo') return sections.find((s) => inferSectionLane(s.name) === 'todo') ?? sections[0]
    if (lane === 'in_progress') {
      const middle = sections[Math.floor(sections.length / 2)]
      return middle ?? sections[0]
    }
    return sections[sections.length - 1]
  }

  const priorities = CANONICAL_NAME_PRIORITY[lane]
  for (const preferred of priorities) {
    const match = inLane.find((section) => section.name.trim().toLowerCase() === preferred)
    if (match) return match
  }

  return [...inLane].sort((a, b) => a.sortOrder - b.sortOrder)[0]
}

export function groupTasksByLane(
  tasks: Task[],
  sectionsById: Map<string, Section>,
): Map<BoardLane, Task[]> {
  const grouped = new Map<BoardLane, Task[]>(
    BOARD_LANES.map((lane) => [lane.id, [] as Task[]]),
  )

  for (const task of tasks) {
    const section = sectionsById.get(task.sectionId)
    const lane = resolveTaskLane(task, section)
    grouped.get(lane)!.push(task)
  }

  for (const [, laneTasks] of grouped) {
    laneTasks.sort((a, b) => {
      const sectionA = sectionsById.get(a.sectionId)?.sortOrder ?? 0
      const sectionB = sectionsById.get(b.sectionId)?.sortOrder ?? 0
      if (sectionA !== sectionB) return sectionA - sectionB
      return a.sortOrder - b.sortOrder
    })
  }

  return grouped
}

export function laneCompletionForDrop(lane: BoardLane, now: number): Pick<Task, 'completed' | 'completedAt'> {
  if (lane === 'done') return { completed: true, completedAt: now }
  return { completed: false, completedAt: null }
}
