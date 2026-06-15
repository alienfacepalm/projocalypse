import type { Section, Task } from '@/models/types'
import type { TaskWorkflowStatus } from '@/lib/task-workflow-status'

/** Kanban-style workflow implied by a section name. Sprint/phase buckets return null. */
export type SectionWorkflowKind = 'todo' | 'in_progress' | 'done' | 'blocked'

const SECTION_KIND_PATTERNS: Record<SectionWorkflowKind, RegExp[]> = {
  blocked: [/^(blocked|on hold|waiting)$/i],
  done: [/^(done|complete|completed|shipped)$/i],
  in_progress: [/^(in progress|in-progress|doing|wip)$/i],
  todo: [/^(to do|todo|backlog|open|new)$/i],
}

const KIND_TO_STATUS: Record<SectionWorkflowKind, TaskWorkflowStatus> = {
  todo: 'todo',
  in_progress: 'in_progress',
  done: 'done',
  blocked: 'blocked',
}

/** Match order matters: blocked/done before todo (e.g. not "done" as substring). */
const KIND_CHECK_ORDER: SectionWorkflowKind[] = ['blocked', 'done', 'in_progress', 'todo']

export function parseSectionWorkflowKind(sectionName: string | undefined): SectionWorkflowKind | null {
  const normalized = sectionName?.trim()
  if (!normalized) return null
  for (const kind of KIND_CHECK_ORDER) {
    if (SECTION_KIND_PATTERNS[kind].some((pattern) => pattern.test(normalized))) return kind
  }
  return null
}

export function sectionWorkflowKindToStatus(kind: SectionWorkflowKind): TaskWorkflowStatus {
  return KIND_TO_STATUS[kind]
}

export function findSectionByWorkflowKind(
  sections: Section[],
  kind: SectionWorkflowKind,
): Section | undefined {
  return sections.find((section) => parseSectionWorkflowKind(section.name) === kind)
}

export function completionUpdatesForSectionMove(
  task: Task,
  fromSectionName: string | undefined,
  toSectionName: string | undefined,
  now = Date.now(),
): Partial<Pick<Task, 'completed' | 'completedAt'>> | null {
  const fromKind = parseSectionWorkflowKind(fromSectionName)
  const toKind = parseSectionWorkflowKind(toSectionName)

  if (toKind === 'done' && !task.completed) {
    return { completed: true, completedAt: now }
  }
  if (fromKind === 'done' && toKind !== 'done' && task.completed) {
    return { completed: false, completedAt: null }
  }
  return null
}

export function sectionIdForCompletionToggle(
  task: Task,
  sections: Section[],
  completing: boolean,
): string | null {
  const targetKind: SectionWorkflowKind = completing ? 'done' : 'todo'
  const target = findSectionByWorkflowKind(sections, targetKind)
  if (!target || target.id === task.sectionId) return null
  return target.id
}
