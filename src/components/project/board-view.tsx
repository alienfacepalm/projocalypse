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
import { SortableContext, horizontalListSortingStrategy, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { db } from '@/db/schema'
import { reorderSections, reorderTasks } from '@/db/operations'
import type { Section, Task } from '@/models/types'
import { applyProjectTaskView, type ProjectTaskViewOptions } from '@/lib/project-task-view'
import { columnDroppableId, computeTaskReorderUpdates } from '@/lib/task-drag'
import { computeSectionReorderUpdates, sectionIdFromSortableId, sortableSectionId } from '@/lib/section-drag'
import { AddSectionButton, BoardSectionHeader } from './section-header'
import { TaskRow } from './task-row'
import { QuickAddTask } from '@/components/task/quick-add-task'
import { cn } from '@/lib/utils'

interface BoardViewProps {
  projectId: string
  taskViewOptions: ProjectTaskViewOptions
  sectionNameById: Map<string, string>
}

function BoardColumnBody({
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
            <div key={task.id} className="overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm">
              <TaskRow task={task} sectionName={section.name} compact />
            </div>
          ))}
        </div>
      </SortableContext>
      <QuickAddTask projectId={projectId} sectionId={section.id} placeholder="Add task…" />
    </div>
  )
}

function SortableBoardColumn({
  section,
  tasks,
  projectId,
}: {
  section: Section
  tasks: Task[]
  projectId: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableSectionId(section.id),
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-72 shrink-0 flex-col rounded-xl border border-border/80 bg-card/60 shadow-sm backdrop-blur-sm"
    >
      <BoardSectionHeader
        section={section}
        taskCount={tasks.length}
        sortable
        dragHandleProps={{ ...attributes, ...listeners }}
      />
      <BoardColumnBody section={section} tasks={tasks} projectId={projectId} />
    </div>
  )
}

export function BoardView({ projectId, taskViewOptions, sectionNameById }: BoardViewProps) {
  const sections = useLiveQuery(() => db.sections.where('projectId').equals(projectId).sortBy('sortOrder'), [projectId])
  const allTasks = useLiveQuery(() => db.tasks.where('projectId').equals(projectId).toArray(), [projectId])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeSection, setActiveSection] = useState<Section | null>(null)

  const visibleTasks = useMemo(
    () => applyProjectTaskView(allTasks ?? [], sectionNameById, taskViewOptions),
    [allTasks, sectionNameById, taskViewOptions],
  )

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of visibleTasks) {
      const list = map.get(task.sectionId) ?? []
      list.push(task)
      map.set(task.sectionId, list)
    }
    return map
  }, [visibleTasks])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const sectionSortableIds = (sections ?? []).map((section) => sortableSectionId(section.id))

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id)
    if (activeId.startsWith('section:')) {
      const section = sections?.find((item) => sortableSectionId(item.id) === activeId)
      if (section) setActiveSection(section)
      return
    }
    const task = allTasks?.find((t) => t.id === activeId)
    if (task) setActiveTask(task)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    setActiveSection(null)
    const { active, over } = event
    if (!over || !allTasks || !sections) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId.startsWith('section:')) {
      if (!overId.startsWith('section:')) return
      const updates = computeSectionReorderUpdates(
        sections,
        sectionIdFromSortableId(activeId),
        sectionIdFromSortableId(overId),
      )
      if (updates) await reorderSections(updates)
      return
    }

    const updates = computeTaskReorderUpdates(allTasks, activeId, overId)
    if (!updates) return

    await reorderTasks(updates)
  }

  const activeSectionName = activeTask ? sectionNameById.get(activeTask.sectionId) : undefined

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full flex-col">
        <div className={cn('flex flex-1 gap-4 overflow-x-auto p-4')}>
          <SortableContext items={sectionSortableIds} strategy={horizontalListSortingStrategy}>
            {sections?.map((section) => (
              <SortableBoardColumn
                key={section.id}
                section={section}
                tasks={tasksBySection.get(section.id) ?? []}
                projectId={projectId}
              />
            ))}
          </SortableContext>
          <div className="flex w-72 shrink-0 items-start pt-2">
            <AddSectionButton projectId={projectId} />
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-72 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
            <TaskRow task={activeTask} sectionName={activeSectionName} draggable={false} compact />
          </div>
        ) : null}
        {activeSection ? (
          <div className="w-72 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold shadow-lg">
            {activeSection.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
