import type { Task } from '@/models/types'

export const columnDroppableId = (sectionId: string) => `column:${sectionId}`

export function isColumnDroppableId(id: string): boolean {
  return id.startsWith('column:')
}

export function sectionIdFromColumnDroppableId(id: string): string {
  return id.slice('column:'.length)
}

export function computeTaskReorderUpdates(
  allTasks: Task[],
  activeTaskId: string,
  overId: string,
): { id: string; sectionId: string; sortOrder: number }[] | null {
  const activeTaskItem = allTasks.find((task) => task.id === activeTaskId)
  if (!activeTaskItem) return null
  if (activeTaskId === overId) return null

  let targetSectionId: string
  let insertIndex: number

  if (isColumnDroppableId(overId)) {
    targetSectionId = sectionIdFromColumnDroppableId(overId)
    const sectionTasks = allTasks
      .filter((task) => task.sectionId === targetSectionId && task.id !== activeTaskItem.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    insertIndex = sectionTasks.length
    sectionTasks.splice(insertIndex, 0, { ...activeTaskItem, sectionId: targetSectionId })

    const updates = sectionTasks.map((task, index) => ({
      id: task.id,
      sectionId: targetSectionId,
      sortOrder: index,
    }))

    if (activeTaskItem.sectionId !== targetSectionId) {
      const sourceTasks = allTasks
        .filter((task) => task.sectionId === activeTaskItem.sectionId && task.id !== activeTaskItem.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      updates.push(
        ...sourceTasks.map((task, index) => ({
          id: task.id,
          sectionId: activeTaskItem.sectionId,
          sortOrder: index,
        })),
      )
    }

    return updates
  }

  const overTaskItem = allTasks.find((task) => task.id === overId)
  if (!overTaskItem) return null

  targetSectionId = overTaskItem.sectionId
  const sectionTasks = allTasks
    .filter((task) => task.sectionId === targetSectionId && task.id !== activeTaskItem.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  insertIndex = sectionTasks.findIndex((task) => task.id === overId)
  sectionTasks.splice(insertIndex >= 0 ? insertIndex : sectionTasks.length, 0, {
    ...activeTaskItem,
    sectionId: targetSectionId,
  })

  const updates = sectionTasks.map((task, index) => ({
    id: task.id,
    sectionId: targetSectionId,
    sortOrder: index,
  }))

  if (activeTaskItem.sectionId !== targetSectionId) {
    const sourceTasks = allTasks
      .filter((task) => task.sectionId === activeTaskItem.sectionId && task.id !== activeTaskItem.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    updates.push(
      ...sourceTasks.map((task, index) => ({
        id: task.id,
        sectionId: activeTaskItem.sectionId,
        sortOrder: index,
      })),
    )
  }

  return updates
}
