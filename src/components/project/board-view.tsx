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
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { db } from '@/db/schema'
import { applyBoardTaskUpdates } from '@/db/operations'
import type { Section, Task } from '@/models/types'
import {
  BOARD_LANES,
  type BoardLane,
  groupTasksByLane,
  pickCanonicalSection,
} from '@/lib/board-lanes'
import { computeBoardTaskReorderUpdates, laneDroppableId } from '@/lib/board-task-drag'
import { TaskRow } from './task-row'
import { QuickAddTask } from '@/components/task/quick-add-task'
import { cn } from '@/lib/utils'

interface BoardViewProps {
  projectId: string
  showCompleted: boolean
}

const LANE_ICONS: Record<BoardLane, typeof Circle> = {
  todo: Circle,
  in_progress: Loader2,
  done: CheckCircle2,
}

const LANE_STYLES: Record<
  BoardLane,
  { column: string; header: string; icon: string }
> = {
  todo: {
    column: 'border-border bg-card/60',
    header: 'border-b border-border bg-muted/40 text-muted-foreground',
    icon: 'text-muted-foreground',
  },
  in_progress: {
    column: 'border-2 border-accent2 bg-card/80 shadow-hud-magenta',
    header: 'border-b-2 border-accent2 bg-accent2/10 text-accent2',
    icon: 'text-accent2',
  },
  done: {
    column: 'border-primary/50 bg-card/50 opacity-95',
    header: 'border-b border-primary/40 bg-primary/5 text-primary',
    icon: 'text-primary',
  },
}

function BoardLaneHeader({
  lane,
  taskCount,
}: {
  lane: (typeof BOARD_LANES)[number]
  taskCount: number
}) {
  const Icon = LANE_ICONS[lane.id]
  const styles = LANE_STYLES[lane.id]

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2.5', styles.header)}>
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          styles.icon,
          lane.id === 'in_progress' && taskCount > 0 && 'animate-spin',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="font-display text-xs font-bold uppercase tracking-widest">{lane.label}</p>
        <p className="truncate text-[10px] normal-case tracking-normal text-muted-foreground">
          {lane.description}
        </p>
      </div>
      <span className="font-display text-sm font-bold tabular-nums">{taskCount}</span>
    </div>
  )
}

function BoardLaneColumn({
  lane,
  tasks,
  projectId,
  sectionsById,
  canonicalSectionId,
}: {
  lane: (typeof BOARD_LANES)[number]
  tasks: Task[]
  projectId: string
  sectionsById: Map<string, Section>
  canonicalSectionId: string | undefined
}) {
  const taskIds = tasks.map((t) => t.id)
  const { setNodeRef, isOver } = useDroppable({ id: laneDroppableId(lane.id) })
  const styles = LANE_STYLES[lane.id]

  return (
    <div className={cn('flex w-80 shrink-0 flex-col shadow-hud-sm backdrop-blur-sm', styles.column)}>
      <BoardLaneHeader lane={lane} taskCount={tasks.length} />
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[160px] flex-1 flex-col overflow-y-auto p-2 transition-colors',
          isOver && 'bg-primary/10 ring-2 ring-inset ring-primary/40',
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => {
              const section = sectionsById.get(task.sectionId)
              return (
                <div key={task.id} className="border border-border bg-background shadow-hud-sm">
                  <TaskRow task={task} compact sectionName={section?.name} />
                </div>
              )
            })}
          </div>
        </SortableContext>
        {canonicalSectionId && (
          <QuickAddTask
            projectId={projectId}
            sectionId={canonicalSectionId}
            placeholder={`Add to ${lane.shortLabel.toLowerCase()}…`}
          />
        )}
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

  const sectionsById = useMemo(
    () => new Map((sections ?? []).map((section) => [section.id, section])),
    [sections],
  )

  const visibleTasks = useMemo(() => {
    if (!allTasks) return []
    if (showCompleted) return allTasks
    return allTasks.filter((task) => !task.completed)
  }, [allTasks, showCompleted])

  const tasksByLane = useMemo(
    () => groupTasksByLane(visibleTasks, sectionsById),
    [visibleTasks, sectionsById],
  )

  const canonicalSectionByLane = useMemo(() => {
    const map = new Map<BoardLane, string>()
    if (!sections) return map
    for (const lane of BOARD_LANES) {
      const section = pickCanonicalSection(sections, lane.id)
      if (section) map.set(lane.id, section.id)
    }
    return map
  }, [sections])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragStart(event: DragStartEvent) {
    const task = allTasks?.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over || !allTasks || !sections) return

    const updates = computeBoardTaskReorderUpdates(
      allTasks,
      sections,
      String(active.id),
      String(over.id),
    )
    if (!updates) return

    await applyBoardTaskUpdates(updates)
  }

  const lanesToShow = showCompleted ? BOARD_LANES : BOARD_LANES.filter((lane) => lane.id !== 'done')

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col">
        <div className="hud-scrollbar flex flex-1 justify-center gap-4 overflow-x-auto p-4">
          {lanesToShow.map((lane) => (
            <BoardLaneColumn
              key={lane.id}
              lane={lane}
              tasks={tasksByLane.get(lane.id) ?? []}
              projectId={projectId}
              sectionsById={sectionsById}
              canonicalSectionId={canonicalSectionByLane.get(lane.id)}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-80 border-2 border-primary bg-background shadow-hud">
            <TaskRow task={activeTask} draggable={false} compact showTooltip={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
