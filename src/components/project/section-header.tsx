import { useState } from 'react'
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from 'lucide-react'
import type { Section, Task } from '@/models/types'
import { createSection, deleteSection, updateSection } from '@/db/operations'
import { QuickAddTask } from '@/components/task/quick-add-task'
import { TaskRow } from './task-row'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface SectionHeaderProps {
  section: Section
  taskCount: number
  collapsed: boolean
  onToggle: () => void
}

export function SectionHeader({ section, taskCount, collapsed, onToggle }: SectionHeaderProps) {
  const [editing, setEditing] = useState(false)
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
    <div className="group flex items-center gap-1 bg-muted/40 px-3 py-2">
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
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (confirm(`Delete section "${section.name}" and all its tasks?`)) {
                  deleteSection(section.id)
                }
              }}
            >
              Delete section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

interface SectionBlockProps {
  section: Section
  tasks: Task[]
  projectId: string
  showCompleted: boolean
  collapsed: boolean
  onToggle: () => void
}

export function SectionBlock({ section, tasks, projectId, showCompleted, collapsed, onToggle }: SectionBlockProps) {
  const visibleTasks = showCompleted ? tasks : tasks.filter((t) => !t.completed)
  const taskIds = visibleTasks.map((t) => t.id)

  return (
    <div className="mb-2">
      <SectionHeader
        section={section}
        taskCount={visibleTasks.length}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (
        <>
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {visibleTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
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
