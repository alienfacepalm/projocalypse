import { useState, type ComponentProps } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Plus } from 'lucide-react'
import type { Section, Task } from '@/models/types'
import { createSection, deleteSection, updateSection } from '@/db/operations'
import { sortableSectionId } from '@/lib/section-drag'
import { QuickAddTask } from '@/components/task/quick-add-task'
import { TaskRow } from './task-row'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

function SectionDeleteConfirm({
  section,
  open,
  onOpenChange,
}: {
  section: Section
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete "${section.name}"?`}
      description="All tasks in this section will be permanently removed. This cannot be undone."
      confirmLabel="Delete section"
      destructive
      onConfirm={() => deleteSection(section.id)}
    />
  )
}

interface SectionHeaderProps {
  section: Section
  taskCount: number
  collapsed: boolean
  onToggle: () => void
  sortable?: boolean
}

export function SectionHeader({ section, taskCount, collapsed, onToggle, sortable = false }: SectionHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(section.name)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableSectionId(section.id),
    disabled: !sortable,
  })

  const style = sortable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  async function saveName() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== section.name) {
      await updateSection(section.id, trimmed)
    } else {
      setName(section.name)
    }
    setEditing(false)
  }

  return (
    <div ref={sortable ? setNodeRef : undefined} style={style} className="group flex items-center gap-1 bg-muted/40 px-3 py-2">
      {sortable && (
        <button
          type="button"
          className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100"
          aria-label={`Reorder ${section.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <button type="button" onClick={onToggle} className="text-muted-foreground">
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {editing ? (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveName()
            if (e.key === 'Escape') {
              setName(section.name)
              setEditing(false)
            }
          }}
          className="h-7 max-w-xs text-sm font-semibold"
          autoFocus
        />
      ) : (
        <button
          type="button"
          className="text-sm font-semibold hover:underline"
          onClick={() => setEditing(true)}
        >
          {section.name}
        </button>
      )}
      <span className="text-xs text-muted-foreground">{taskCount}</span>
      <div className="ml-auto opacity-0 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>Rename section</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
              Delete section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SectionDeleteConfirm section={section} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  )
}

interface SectionBlockProps {
  section: Section
  tasks: Task[]
  projectId: string
  collapsed: boolean
  onToggle: () => void
  sortable?: boolean
}

export function SectionBlock({
  section,
  tasks,
  projectId,
  collapsed,
  onToggle,
  sortable = false,
}: SectionBlockProps) {
  const taskIds = tasks.map((t) => t.id)

  return (
    <div className="mb-2">
      <SectionHeader
        section={section}
        taskCount={tasks.length}
        collapsed={collapsed}
        onToggle={onToggle}
        sortable={sortable}
      />
      {!collapsed && (
        <>
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} sectionName={section.name} />
            ))}
          </SortableContext>
          <QuickAddTask projectId={projectId} sectionId={section.id} />
        </>
      )}
    </div>
  )
}

export function AddSectionButton({ projectId }: { projectId: string }) {
  async function handleAdd() {
    const name = prompt('Section name')
    if (name?.trim()) await createSection(projectId, name.trim())
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <Plus className="h-4 w-4" />
      Add section
    </button>
  )
}

interface BoardSectionHeaderProps {
  section: Section
  taskCount: number
  sortable?: boolean
  dragHandleProps?: ComponentProps<'button'>
}

export function BoardSectionHeader({ section, taskCount, sortable = false, dragHandleProps }: BoardSectionHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(section.name)

  async function saveName() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== section.name) {
      await updateSection(section.id, trimmed)
    } else {
      setName(section.name)
    }
    setEditing(false)
  }

  return (
    <div className="group relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-muted/30 via-muted/10 to-transparent">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
      />
      {sortable && dragHandleProps && (
        <button
          type="button"
          className="absolute left-1 top-1/2 z-10 -translate-y-1/2 cursor-grab rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted/60 hover:text-foreground group-hover:opacity-100"
          aria-label={`Reorder ${section.name}`}
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="absolute right-0.5 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>Rename section</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
              Delete section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SectionDeleteConfirm section={section} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <div className="flex flex-col items-center gap-1.5 px-10 py-3.5 text-center">
        {editing ? (
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={saveName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveName()
              if (event.key === 'Escape') {
                setName(section.name)
                setEditing(false)
              }
            }}
            className="h-8 max-w-full text-center font-display text-sm font-semibold tracking-tight"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-display text-[0.9375rem] font-semibold leading-snug tracking-tight text-foreground transition-colors hover:text-primary"
          >
            {section.name}
          </button>
        )}
        <span
          className={cn(
            'inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-2',
            'bg-background/70 text-[10px] font-medium tabular-nums leading-none text-muted-foreground',
            'ring-1 ring-border/50 backdrop-blur-sm',
          )}
          aria-label={`${taskCount} tasks`}
        >
          {taskCount}
        </span>
      </div>
    </div>
  )
}
