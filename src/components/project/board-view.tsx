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
import { columnDroppableId, computeTaskReorderUpdates } from '@/lib/task-drag'
import {
  computeSectionReorderUpdates,
  sectionIdFromReorderOverId,
  sectionIdFromSortableId,
  sortableSectionId,
} from '@/lib/section-drag'
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableSectionId(section.id),
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: columnDroppableId(section.id) })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-80 shrink-0 flex-col border border-border bg-card/60 shadow-hud-sm backdrop-blur-sm"
    >
      <BoardSectionHeader
        section={section}
        taskCount={tasks.length}
        sortable
        dragHandleProps={{ attributes, listeners }}
      />
      <div
        ref={setDropRef}
        className={cn(
          'flex min-h-[160px] flex-1 flex-col overflow-y-auto p-2 transition-colors',
          isOver && 'bg-primary/10 ring-2 ring-inset ring-primary/40',
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="border border-border bg-background shadow-hud-sm">
                <TaskRow task={task} compact sectionName={section.name} />
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
  const sections = useLiveQuery(
    () => db.sections.where('projectId').equals(projectId).sortBy('sortOrder'),
    [projectId],
  )
  const allTasks = useLiveQuery(() => db.tasks.where('projectId').equals(projectId).toArray(), [projectId])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeSection, setActiveSection] = useState<Section | null>(null)

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
      const overSectionId = sectionIdFromReorderOverId(overId)
      if (!overSectionId) return
      const updates = computeSectionReorderUpdates(
        sections,
        sectionIdFromSortableId(activeId),
        overSectionId,
      )
      if (updates) await reorderSections(updates)
      return
    }

    const updates = computeTaskReorderUpdates(allTasks, activeId, overId)
    if (!updates) return

    await reorderTasks(updates)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col">
        <div className="hud-scrollbar flex flex-1 gap-4 overflow-x-auto p-4">
          <SortableContext items={sectionSortableIds} strategy={horizontalListSortingStrategy}>
            {sections?.map((section) => (
              <BoardColumn
                key={section.id}
                section={section}
                tasks={tasksBySection.get(section.id) ?? []}
                projectId={projectId}
              />
            ))}
          </SortableContext>
          <div className="flex w-80 shrink-0 items-start pt-2">
            <AddSectionButton projectId={projectId} />
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-80 border-2 border-primary bg-background shadow-hud">
            <TaskRow task={activeTask} draggable={false} compact showTooltip={false} />
          </div>
        ) : null}
        {activeSection ? (
          <div className="flex w-80 flex-col border-2 border-primary bg-card/90 shadow-hud backdrop-blur-sm">
            <div className="border-b-2 border-primary/40 px-3 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-primary">
              {activeSection.name}
            </div>
            <div className="min-h-[80px] p-2 text-xs text-muted-foreground">
              {(tasksBySection.get(activeSection.id) ?? []).length} task
              {(tasksBySection.get(activeSection.id) ?? []).length !== 1 ? 's' : ''}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
