import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useLocation } from 'react-router-dom'
import { CheckSquare, Download, Menu, Plus, Upload, X } from 'lucide-react'
import { db } from '@/db/schema'
import { createProject } from '@/db/operations'
import { exportData, importData, parseImportJson } from '@/lib/export-import'
import { cn, downloadJson } from '@/lib/utils'
import { PROJECT_COLORS } from '@/models/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()
  const projects = useLiveQuery(() => db.projects.filter((p) => !p.archived).sortBy('sortOrder'), [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(PROJECT_COLORS[3])
  const [importError, setImportError] = useState<string | null>(null)

  async function handleCreateProject() {
    const name = projectName.trim()
    if (!name) return
    await createProject(name, selectedColor)
    setProjectName('')
    setDialogOpen(false)
  }

  async function handleExport() {
    const data = await exportData()
    downloadJson(data, `projocalypse-backup-${new Date().toISOString().slice(0, 10)}.json`)
  }

  async function handleImport() {
    setImportError(null)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = parseImportJson(text)
        if (!confirm('Import will replace all current data. Continue?')) return
        await importData(data)
        setImportError(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Import failed.'
        setImportError(message)
        alert(message)
      }
    }
    input.click()
  }

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
        <div>
          <h1 className="font-display text-lg font-semibold tracking-tight">Projocalypse</h1>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Project command</p>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <Link
          to="/my-tasks"
          onClick={onClose}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent',
            location.pathname === '/my-tasks' && 'bg-accent font-medium text-accent-foreground',
          )}
        >
          <CheckSquare className="h-4 w-4" />
          My Tasks
        </Link>

        <div className="mt-5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Projects
        </div>

        <div className="mt-1.5 space-y-0.5">
          {projects?.map((project) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              onClick={onClose}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent',
                location.pathname === `/project/${project.id}` && 'bg-accent font-medium text-accent-foreground',
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border/60" style={{ backgroundColor: project.color }} />
              <span className="truncate">{project.name}</span>
            </Link>
          ))}
          {projects?.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No projects yet — create one below.</p>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Create project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Marketing launch"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'h-7 w-7 rounded-full border-2',
                        selectedColor === color ? 'border-foreground' : 'border-transparent',
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreateProject} disabled={!projectName.trim()} className="w-full">
                Create project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </nav>

      <div className="border-t border-border/60 p-2">
        {importError && (
          <p className="mb-2 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">{importError}</p>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start text-sm">
              Settings
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export backup
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              Import backup
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              Data stored locally in IndexedDB
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-sidebar md:block">{content}</aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border/70 bg-sidebar shadow-xl">{content}</aside>
        </div>
      )}
    </>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="md:hidden" onClick={onClick}>
      <Menu className="h-5 w-5" />
    </Button>
  )
}
