import type { Section, Task } from '@/models/types'
import {
  type BoardLane,
  inferSectionLane,
  laneCompletionForDrop,
  pickCanonicalSection,
  resolveTaskLane,
} from '@/lib/board-lanes'
import { isColumnDroppableId, computeTaskReorderUpdates } from '@/lib/task-drag'

export const laneDroppableId = (lane: BoardLane) => `lane:${lane}`

export function isLaneDroppableId(id: string): boolean {
  return id.startsWith('lane:')
}

export function laneFromDroppableId(id: string): BoardLane {
  return id.slice('lane:'.length) as BoardLane
}

export interface BoardTaskUpdate {
  id: string
  sectionId: string
  sortOrder: number
  completed?: boolean
  completedAt?: number | null
}

function sectionsById(sections: Section[]): Map<string, Section> {
  return new Map(sections.map((section) => [section.id, section]))
}

function laneForTask(task: Task, sectionMap: Map<string, Section>): BoardLane {
  return resolveTaskLane(task, sectionMap.get(task.sectionId))
}

function sortLaneTasks(tasks: Task[], sectionMap: Map<string, Section>): Task[] {
  return [...tasks].sort((a, b) => {
    const sectionA = sectionMap.get(a.sectionId)?.sortOrder ?? 0
    const sectionB = sectionMap.get(b.sectionId)?.sortOrder ?? 0
    if (sectionA !== sectionB) return sectionA - sectionB
    return a.sortOrder - b.sortOrder
  })
}

function completionPatchForActive(activeId: string, taskId: string, lane: BoardLane, now: number): Partial<BoardTaskUpdate> {
  if (taskId !== activeId) return {}
  return laneCompletionForDrop(lane, now)
}

/** Board drag-drop: reorder within a lane or move across workflow lanes. */
export function computeBoardTaskReorderUpdates(
  allTasks: Task[],
  sections: Section[],
  activeTaskId: string,
  overId: string,
  now = Date.now(),
): BoardTaskUpdate[] | null {
  const activeTask = allTasks.find((task) => task.id === activeTaskId)
  if (!activeTask) return null
  if (activeTaskId === overId) return null

  const sectionMap = sectionsById(sections)
  const activeLane = laneForTask(activeTask, sectionMap)

  if (isLaneDroppableId(overId)) {
    const targetLane = laneFromDroppableId(overId)
    const targetSection = pickCanonicalSection(sections, targetLane)
    if (!targetSection) return null

    const laneTasks = sortLaneTasks(
      allTasks.filter((task) => task.id !== activeTask.id && laneForTask(task, sectionMap) === targetLane),
      sectionMap,
    )

    laneTasks.push({
      ...activeTask,
      sectionId: targetSection.id,
      ...laneCompletionForDrop(targetLane, now),
    })

    const updates: BoardTaskUpdate[] = laneTasks.map((task, index) => ({
      id: task.id,
      sectionId: task.id === activeTask.id ? targetSection.id : task.sectionId,
      sortOrder: index,
      ...completionPatchForActive(activeTask.id, task.id, targetLane, now),
    }))

    if (activeLane !== targetLane) {
      const sourceTasks = sortLaneTasks(
        allTasks.filter(
          (task) =>
            task.sectionId === activeTask.sectionId &&
            task.id !== activeTask.id &&
            laneForTask(task, sectionMap) === activeLane,
        ),
        sectionMap,
      )
      updates.push(
        ...sourceTasks.map((task, index) => ({
          id: task.id,
          sectionId: task.sectionId,
          sortOrder: index,
        })),
      )
    }

    return updates
  }

  const overTask = allTasks.find((task) => task.id === overId)
  if (!overTask) {
    if (isColumnDroppableId(overId)) {
      const sectionId = overId.slice('column:'.length)
      const targetLane = inferSectionLane(sections.find((s) => s.id === sectionId)?.name ?? '')
      return (
        computeTaskReorderUpdates(allTasks, activeTaskId, overId)?.map((update) => ({
          ...update,
          ...completionPatchForActive(activeTask.id, update.id, targetLane, now),
        })) ?? null
      )
    }
    return null
  }

  const targetLane = laneForTask(overTask, sectionMap)
  const targetSectionId = overTask.sectionId

  const laneTasks = sortLaneTasks(
    allTasks.filter((task) => task.id !== activeTask.id && laneForTask(task, sectionMap) === targetLane),
    sectionMap,
  )

  const insertIndex = laneTasks.findIndex((task) => task.id === overId)
  laneTasks.splice(insertIndex >= 0 ? insertIndex : laneTasks.length, 0, {
    ...activeTask,
    sectionId: targetSectionId,
    ...laneCompletionForDrop(targetLane, now),
  })

  const updates: BoardTaskUpdate[] = laneTasks.map((task, index) => ({
    id: task.id,
    sectionId: task.id === activeTask.id ? targetSectionId : task.sectionId,
    sortOrder: index,
    ...completionPatchForActive(activeTask.id, task.id, targetLane, now),
  }))

  if (activeTask.sectionId !== targetSectionId || activeLane !== targetLane) {
    const sourceTasks = sortLaneTasks(
      allTasks.filter(
        (task) =>
          task.sectionId === activeTask.sectionId &&
          task.id !== activeTask.id &&
          laneForTask(task, sectionMap) === activeLane,
      ),
      sectionMap,
    )
    updates.push(
      ...sourceTasks.map((task, index) => ({
        id: task.id,
        sectionId: task.sectionId,
        sortOrder: index,
      })),
    )
  }

  return updates
}
