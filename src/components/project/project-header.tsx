import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, LayoutGrid, List, MoreHorizontal, Trash2 } from 'lucide-react'
import type { Project, ViewMode } from '@/models/types'
import { PROJECT_COLORS } from '@/models/types'
import { archiveProject, deleteProject, updateProject } from '@/db/operations'
import { setViewMode } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ProjectHeaderProps {
  project: Project
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function ProjectHeader({
  project,
  viewMode,
  onViewModeChange,
}: ProjectHeaderProps) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(project.name)

  async function saveName() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== project.name) {
      await updateProject(project.id, { name: trimmed })
    } else {
      setName(project.name)
    }
    setEditing(false)
  }

  function switchView(mode: ViewMode) {
    setViewMode(project.id, mode)
    onViewModeChange(mode)
  }

  async function handleArchive() {
    await archiveProject(project.id)
    navigate('/my-tasks')
  }

  async function handleDelete() {
    await deleteProject(project.id)
    navigate('/my-tasks')
  }

  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-sm">
      <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-background" style={{ backgroundColor: project.color }} />
      {editing ? (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveName()
            if (e.key === 'Escape') {
              setName(project.name)
              setEditing(false)
            }
          }}
          className="max-w-xs font-display text-lg font-semibold"
          autoFocus
        />
      ) : (
        <button
          type="button"
          className="font-display text-lg font-semibold tracking-tight hover:underline"
          onClick={() => setEditing(true)}
        >
          {project.name}
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <Popover>
            <PopoverTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Change project color</DropdownMenuItem>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'h-6 w-6 rounded-full border-2',
                      project.color === color ? 'border-foreground' : 'border-transparent',
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => updateProject(project.id, { color })}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
            <Archive className="mr-2 h-4 w-4" />
            Archive project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={`Archive "${project.name}"?`}
        description="The project will be hidden from your sidebar. You can restore it later from a backup."
        confirmLabel="Archive project"
        onConfirm={handleArchive}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${project.name}"?`}
        description="All sections, tasks, and subtasks in this project will be permanently removed. This cannot be undone."
        confirmLabel="Delete project"
        destructive
        onConfirm={handleDelete}
      />

      <div className="ml-auto flex items-center gap-2">
        <div className="flex rounded-lg border border-border/70 bg-muted/40 p-0.5">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => switchView('list')}
          >
            <List className="mr-1 h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === 'board' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => switchView('board')}
          >
            <LayoutGrid className="mr-1 h-4 w-4" />
            Board
          </Button>
        </div>
      </div>
    </header>
  )
}
