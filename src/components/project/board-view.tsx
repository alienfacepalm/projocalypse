import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { db } from '@/db/schema'
import { reorderTasks } from '@/db/operations'
import type { Section, Task } from '@/models/types'
import { columnDroppableId, computeTaskReorderUpdates } from '@/lib/task-drag'
import { AddSectionButton, BoardSectionHeader } from './section-header'
import { TaskRow } from './task-row'
import { QuickAddTask } from '@/components/task/quick-add-task'
import { cn } from '@/lib/utils'

interface BoardViewProps {
  projectId: string
  showCompleted: boolean
}

function BoardColumn({
  section,
  tasks,
  projectId,
}: {
  section: Section
  tasks: Task[]
  projectId: string
}) {
  const taskIds = tasks.map((t) => t.id)
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(section.id) })

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-border/80 bg-card/60 shadow-sm backdrop-blur-sm">
      <BoardSectionHeader section={section} taskCount={tasks.length} />
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[120px] flex-1 flex-col overflow-y-auto p-2 transition-colors',
          isOver && 'bg-primary/5 ring-2 ring-inset ring-primary/25',
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-border/70 bg-background shadow-sm">
                <TaskRow task={task} compact />
              </div>
            ))}
          </div>
        </SortableContext>
        <QuickAddTask projectId={projectId} sectionId={section.id} placeholder="Add task…" />
      </div>
    </div>
  )
}

export function BoardView({ projectId, showCompleted }: BoardViewProps) {
  const sections = useLiveQuery(() => db.sections.where('projectId').equals(projectId).sortBy('sortOrder'), [projectId])
  const allTasks = useLiveQuery(() => db.tasks.where('projectId').equals(projectId).toArray(), [projectId])
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of allTasks ?? []) {
      if (!showCompleted && task.completed) continue
      const list = map.get(task.sectionId) ?? []
      list.push(task)
      map.set(task.sectionId, list)
    }
    for (const [, tasks] of map) {
      tasks.sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return map
  }, [allTasks, showCompleted])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragStart(event: DragStartEvent) {
    const task = allTasks?.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over || !allTasks) return

    const updates = computeTaskReorderUpdates(allTasks, String(active.id), String(over.id))
    if (!updates) return

    await reorderTasks(updates)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full flex-col">
        <div className={cn('flex flex-1 gap-4 overflow-x-auto p-4')}>
          {sections?.map((section) => (
            <BoardColumn
              key={section.id}
              section={section}
              tasks={tasksBySection.get(section.id) ?? []}
              projectId={projectId}
            />
          ))}
          <div className="flex w-72 shrink-0 items-start pt-2">
            <AddSectionButton projectId={projectId} />
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-72 rounded-lg border border-border bg-background shadow-lg">
            <TaskRow task={activeTask} draggable={false} compact />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
