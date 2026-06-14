import { useMemo, useState, type ReactNode } from 'react'
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
import { reorderSections, reorderTasks } from '@/db/operations'
import type { Section, Task } from '@/models/types'
import { columnDroppableId, computeTaskReorderUpdates } from '@/lib/task-drag'
import { computeSectionReorderUpdates, sectionIdFromSortableId, sortableSectionId } from '@/lib/section-drag'
import { AddSectionButton, SectionBlock } from './section-header'
import { TaskRow } from './task-row'
import { QuickAddTask } from '@/components/task/quick-add-task'
import { cn } from '@/lib/utils'

interface ListViewProps {
  projectId: string
  showCompleted: boolean
}

function SectionDropZone({
  sectionId,
  collapsed,
  children,
}: {
  sectionId: string
  collapsed: boolean
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(sectionId) })

  if (collapsed) return <>{children}</>

  return (
    <div
      ref={setNodeRef}
      className={cn('transition-colors', isOver && 'rounded-md bg-primary/5 ring-2 ring-inset ring-primary/20')}
    >
      {children}
    </div>
  )
}

export function ListView({ projectId, showCompleted }: ListViewProps) {
  const sections = useLiveQuery(() => db.sections.where('projectId').equals(projectId).sortBy('sortOrder'), [projectId])
  const allTasks = useLiveQuery(() => db.tasks.where('projectId').equals(projectId).toArray(), [projectId])
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeSection, setActiveSection] = useState<Section | null>(null)

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of allTasks ?? []) {
      const list = map.get(task.sectionId) ?? []
      list.push(task)
      map.set(task.sectionId, list)
    }
    for (const [, tasks] of map) {
      tasks.sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return map
  }, [allTasks])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const sectionSortableIds = (sections ?? []).map((section) => sortableSectionId(section.id))

  function toggleSection(sectionId: string) {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id)
    if (activeId.startsWith('section:')) {
      const section = sections?.find((item) => sortableSectionId(item.id) === activeId)
      if (section) setActiveSection(section)
      return
    }
    const task = allTasks?.find((item) => item.id === activeId)
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

  const firstSectionId = sections?.[0]?.id

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="overflow-y-auto pb-8">
        {firstSectionId && (
          <div className="border-b border-border/60 bg-muted/30 px-1 py-2">
            <QuickAddTask projectId={projectId} sectionId={firstSectionId} placeholder="Add task to first section…" />
          </div>
        )}
        <SortableContext items={sectionSortableIds} strategy={verticalListSortingStrategy}>
          {sections?.map((section) => (
            <SectionDropZone key={section.id} sectionId={section.id} collapsed={!!collapsedSections[section.id]}>
              <SectionBlock
                section={section}
                tasks={tasksBySection.get(section.id) ?? []}
                projectId={projectId}
                showCompleted={showCompleted}
                collapsed={!!collapsedSections[section.id]}
                onToggle={() => toggleSection(section.id)}
                sortable
              />
            </SectionDropZone>
          ))}
        </SortableContext>
        <AddSectionButton projectId={projectId} />
      </div>
      <DragOverlay>
        {activeTask ? <TaskRow task={activeTask} draggable={false} /> : null}
        {activeSection ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-semibold shadow-md">
            {activeSection.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
