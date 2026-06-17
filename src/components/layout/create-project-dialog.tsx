import { useState } from 'react'
import { FolderPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { createProject, findWorkspaceActor } from '@/db/operations'
import { useCanManageProjects } from '@/hooks/use-can-manage-projects'
import { cn } from '@/lib/utils'
import { PROJECT_COLORS } from '@/models/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DEFAULT_COLOR = PROJECT_COLORS[3]

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const navigate = useNavigate()
  const canManageProjects = useCanManageProjects()
  const [projectName, setProjectName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOR)

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (nextOpen) {
      setProjectName('')
      setSelectedColor(DEFAULT_COLOR)
    }
  }

  async function handleCreateProject() {
    const name = projectName.trim()
    if (!name || !canManageProjects) return
    const actor = (await findWorkspaceActor('manageProjects')) ?? undefined
    const project = await createProject(name, selectedColor, actor)
    handleOpenChange(false)
    navigate(`/project/${project.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create project
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Marketing launch"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleCreateProject()
                }
              }}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label id="project-color-label">Color</Label>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-labelledby="project-color-label"
            >
              {PROJECT_COLORS.map((color) => {
                const selected = selectedColor === color
                return (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Color ${color}`}
                    className={cn(
                      'h-7 w-7 shrink-0 cursor-pointer rounded-full transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      selected
                        ? 'scale-110 ring-2 ring-offset-2 ring-foreground shadow-sm'
                        : 'ring-1 ring-border/50 hover:scale-105 hover:ring-border',
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                )
              })}
            </div>
          </div>
          <Button
            onClick={() => void handleCreateProject()}
            disabled={!projectName.trim() || !canManageProjects}
            className="w-full"
          >
            Create project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
