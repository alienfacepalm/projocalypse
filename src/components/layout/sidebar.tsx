import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useLocation } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArchiveRestore, CheckSquare, ChevronDown, ChevronRight, Database, Download, Menu, Plus, Settings, Upload, X } from 'lucide-react'
import { db } from '@/db/schema'
import { exportData, importData, parseImportJson } from '@/lib/export-import'
import { reorderProjects, unarchiveProject } from '@/db/operations'
import { computeProjectReorderUpdates, projectIdFromSortableId, sortableProjectId } from '@/lib/project-drag'
import { useBrowserSync } from '@/hooks/use-browser-sync'
import { useConfirm } from '@/context/confirm-context'
import { useEmbed } from '@/context/embed-context'
import { AppearanceSettingsItems } from '@/components/layout/appearance-settings'
import { ActiveDeveloperMenuItems, DeveloperSettingsMenuItem } from '@/components/layout/developer-settings'
import { useCanManageProjects } from '@/hooks/use-can-manage-projects'
import { SyncSettingsItems } from '@/components/layout/sync-settings'
import { CreateProjectDialog } from '@/components/layout/create-project-dialog'
import { GlobalSearch } from '@/components/layout/global-search'
import { SortableProjectLink } from '@/components/layout/sortable-project-link'
import { cn, downloadJson } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()
  const { productName, tagline, hideProjectSwitcher } = useEmbed()
  const projects = useLiveQuery(() => db.projects.filter((p) => !p.archived).sortBy('sortOrder'), [])
  const archivedProjects = useLiveQuery(() => db.projects.filter((p) => p.archived).sortBy('sortOrder'), [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const syncStatus = useBrowserSync()
  const { confirm } = useConfirm()
  const canManageProjects = useCanManageProjects()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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
        const ok = await confirm({
          title: 'Import backup',
          description: 'Import will replace all current data. Continue?',
          confirmLabel: 'Import',
          variant: 'destructive',
          icon: Upload,
        })
        if (!ok) return
        await importData(data)
        setImportError(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Import failed.'
        setImportError(message)
      }
    }
    input.click()
  }

  async function handleProjectDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !projects) return
    const updates = computeProjectReorderUpdates(
      projects,
      projectIdFromSortableId(String(active.id)),
      projectIdFromSortableId(String(over.id)),
    )
    if (updates) await reorderProjects(updates)
  }

  const projectSortableIds = (projects ?? []).map((project) => sortableProjectId(project.id))

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b-2 border-primary px-4 py-4 shadow-hud-sm">
        <div>
          <h1 className="font-title text-xl font-normal uppercase tracking-widest text-primary">{productName}</h1>
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-accent2">{tagline}</p>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <GlobalSearch />

      <nav className="hud-scrollbar flex-1 overflow-y-auto px-2 py-1">
        <Link
          to="/my-tasks"
          onClick={onClose}
          className={cn(
            'flex items-center gap-2 border border-transparent px-3 py-2 font-display text-xs font-bold uppercase tracking-widest transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground hover:shadow-hud-sm',
            location.pathname === '/my-tasks' &&
              'border-primary bg-accent font-bold text-accent-foreground shadow-hud-sm',
          )}
        >
          <CheckSquare className="h-4 w-4" />
          My Tasks
        </Link>

        {!hideProjectSwitcher && (
          <>
            <div className="mt-5 px-3 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-accent2">
              Projects
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProjectDragEnd}>
              <SortableContext items={projectSortableIds} strategy={verticalListSortingStrategy}>
                <div className="mt-1.5 space-y-0.5">
                  {projects?.map((project) => (
                    <SortableProjectLink key={project.id} project={project} onNavigate={onClose} />
                  ))}
                  {projects?.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No projects yet — create one below.</p>
                  )}
                </div>
              </SortableContext>
            </DndContext>

            <button
              type="button"
              className="mt-2 flex w-full items-center gap-2 border border-dashed border-border px-3 py-2 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground hover:shadow-hud-sm disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setDialogOpen(true)}
              disabled={!canManageProjects}
              title={canManageProjects ? undefined : 'You do not have permission to create projects'}
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </>
        )}

        {!hideProjectSwitcher && (archivedProjects?.length ?? 0) > 0 && (
          <div className="mt-4">
            <button
              type="button"
              className="flex w-full items-center gap-1 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
              onClick={() => setArchivedOpen((value) => !value)}
            >
              {archivedOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Archived ({archivedProjects?.length})
            </button>
            {archivedOpen && (
              <div className="mt-1 space-y-0.5">
                {archivedProjects?.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-1 border border-transparent px-2 py-1.5 text-sm text-muted-foreground hover:border-border hover:bg-accent"
                  >
                    <span
                      className="ml-1 h-2 w-2 shrink-0 rounded-full opacity-60"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="flex-1 truncate px-1">{project.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      title="Restore project"
                      onClick={() => unarchiveProject(project.id)}
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="border-t-2 border-primary p-2 shadow-[0_-2px_0_0_var(--color-primary)]">
        {importError && (
          <p className="mb-2 border border-destructive/40 bg-destructive/10 px-2 py-1.5 font-mono text-xs text-destructive">{importError}</p>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start text-sm">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <AppearanceSettingsItems />
            <DeveloperSettingsMenuItem />
            <ActiveDeveloperMenuItems />
            <SyncSettingsItems status={syncStatus} />
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
              <Database className="mr-2 h-4 w-4 shrink-0" />
              IndexedDB on this device; sync via Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <>
      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <aside className="hidden w-64 shrink-0 border-r-2 border-primary bg-sidebar shadow-hud-sm md:block">{content}</aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/65" onClick={onClose} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r-2 border-primary bg-sidebar shadow-hud">{content}</aside>
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
