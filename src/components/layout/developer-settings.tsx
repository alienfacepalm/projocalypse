import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Crown, Pencil, Plus, Trash2, UserCircle2, Users } from 'lucide-react'
import { db } from '@/db/schema'
import { createDeveloper, deleteDeveloper, updateDeveloper } from '@/db/operations'
import { DeveloperBadge } from '@/components/developer/developer-badge'
import { useActiveDeveloper } from '@/context/active-developer-context'
import { useConfirm } from '@/context/confirm-context'
import type { Developer, DeveloperRole } from '@/models/types'
import { PROJECT_COLORS } from '@/models/types'
import { canAddDeveloper, canManageDeveloperRoster } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function DeveloperRow({
  developer,
  actor,
  canManageRoster,
  onChanged,
}: {
  developer: Developer
  actor: Developer
  canManageRoster: boolean
  onChanged: () => void
}) {
  const { confirm } = useConfirm()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(developer.name)
  const [color, setColor] = useState(developer.color)
  const [role, setRole] = useState<DeveloperRole>(developer.role)
  const isSelf = actor.id === developer.id

  async function saveRename() {
    const trimmed = name.trim()
    if (!trimmed) {
      setName(developer.name)
      setEditing(false)
      return
    }
    if (trimmed !== developer.name || color !== developer.color || role !== developer.role) {
      await updateDeveloper(actor, developer.id, {
        name: trimmed,
        color,
        ...(role !== developer.role ? { role } : {}),
      })
      onChanged()
    }
    setEditing(false)
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Remove developer?',
      description: `Delete "${developer.name}"? Tasks assigned to them will become unassigned.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    })
    if (!ok) return
    await deleteDeveloper(actor, developer.id)
    onChanged()
  }

  const canEdit = canManageRoster || isSelf
  const canDelete = canManageRoster && !isSelf
  const canEditRole = canManageRoster && !isSelf && developer.role !== 'master'

  if (editing && canEdit) {
    return (
      <div className="flex items-center gap-2 border border-primary bg-accent/30 px-2 py-2">
        <DeveloperBadge developer={developer} />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveRename()
            if (e.key === 'Escape') {
              setName(developer.name)
              setEditing(false)
            }
          }}
          className="h-8 flex-1"
          autoFocus
        />
        {canManageRoster && (
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-10 cursor-pointer border border-border bg-transparent p-0"
            aria-label="Badge color"
          />
        )}
        {canEditRole && (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as DeveloperRole)}
            className="h-8 border border-border bg-background px-2 font-mono text-[10px] uppercase"
            aria-label="Developer role"
          >
            <option value="developer">Developer</option>
            <option value="lead">Lead</option>
          </select>
        )}
        <Button type="button" size="sm" onClick={saveRename}>
          Save
        </Button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-2 border border-border px-2 py-2 hover:border-primary hover:bg-accent/30">
      <DeveloperBadge developer={developer} />
      <div className="min-w-0 flex-1">
        <span className="block truncate font-sans text-sm">{developer.name}</span>
        {developer.role === 'master' && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-accent2">Master</span>
        )}
        {developer.role === 'lead' && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-primary">Lead</span>
        )}
      </div>
      {canEdit && (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" title="Rename" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      {canDelete && (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" title="Delete" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

export function DeveloperSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { activeDeveloper, scopeProjectId } = useActiveDeveloper()
  const developers = useLiveQuery(
    () =>
      scopeProjectId
        ? db.developers.where('projectId').equals(scopeProjectId).sortBy('sortOrder')
        : [],
    [scopeProjectId],
  )
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<DeveloperRole>('developer')
  const [, setTick] = useState(0)
  const canAdd = activeDeveloper ? canAddDeveloper(activeDeveloper) : false
  const canManageRoster = activeDeveloper ? canManageDeveloperRoster(activeDeveloper) : false

  async function handleAdd() {
    if (!activeDeveloper || !scopeProjectId || !canAdd) return
    const trimmed = newName.trim()
    if (!trimmed) return
    await createDeveloper(activeDeveloper, scopeProjectId, trimmed, { role: newRole })
    setNewName('')
    setNewRole('developer')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Developers
          </DialogTitle>
        </DialogHeader>
        <p className="font-mono text-xs text-muted-foreground">
          Team members for this project. Assign tasks from the task detail panel.
        </p>
        {canAdd ? (
          <div className="space-y-2">
            <Label htmlFor="developer-name" className="font-display text-[10px] uppercase tracking-widest text-accent2">
              Add developer
            </Label>
            <div className="flex gap-2">
              <Input
                id="developer-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Name"
                className="min-w-0 flex-1"
              />
              {canManageRoster && (
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as DeveloperRole)}
                  className="h-9 shrink-0 border border-border bg-background px-2 font-mono text-[10px] uppercase"
                  aria-label="Role for new developer"
                >
                  <option value="developer">Developer</option>
                  <option value="lead">Lead</option>
                </select>
              )}
              <Button type="button" onClick={handleAdd} disabled={!newName.trim()} className="gap-1 shrink-0">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        ) : (
          <p className="border border-border bg-muted/40 px-3 py-2 font-mono text-[10px] text-muted-foreground">
            Only Master and Lead Developers can add team members. You can still edit your own name.
          </p>
        )}
        <div className="hud-scrollbar max-h-64 space-y-1 overflow-y-auto">
          {(developers?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center gap-2 border border-dashed border-border px-4 py-8 text-center">
              <UserCircle2 className="h-8 w-8 text-muted-foreground" />
              <p className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
                No developers yet
              </p>
            </div>
          ) : (
            activeDeveloper &&
            developers?.map((developer) => (
              <DeveloperRow
                key={developer.id}
                developer={developer}
                actor={activeDeveloper}
                canManageRoster={canManageRoster}
                onChanged={() => setTick((n) => n + 1)}
              />
            ))
          )}
        </div>
        {(developers?.length ?? 0) > 0 && canManageRoster && (
          <p className={cn('font-mono text-[10px] text-muted-foreground')}>
            <Crown className="mr-1 inline h-3 w-3 text-primary" />
            Colors cycle from the project palette ({PROJECT_COLORS.length} presets).
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function DeveloperSettingsMenuItem() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault()
          setOpen(true)
        }}
      >
        <Users className="mr-2 h-4 w-4" />
        Developers
      </DropdownMenuItem>
      <DeveloperSettingsDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export function ActiveDeveloperMenuItems() {
  const { activeDeveloper, setActiveDeveloperId, scopeProjectId } = useActiveDeveloper()
  const developers = useLiveQuery(
    () =>
      scopeProjectId
        ? db.developers.where('projectId').equals(scopeProjectId).sortBy('sortOrder')
        : [],
    [scopeProjectId],
  )

  if (!scopeProjectId || !developers || developers.length <= 1) return null

  return (
    <>
      <DropdownMenuSeparator />
      <div className="px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest text-accent2">
        Active developer
      </div>
      {developers.map((developer) => (
        <DropdownMenuItem key={developer.id} onClick={() => setActiveDeveloperId(developer.id)}>
          <DeveloperBadge developer={developer} className="mr-2" />
          <span className="truncate">{developer.name}</span>
          {activeDeveloper?.id === developer.id ? (
            <span className="ml-auto font-mono text-[10px] text-accent2">Active</span>
          ) : null}
        </DropdownMenuItem>
      ))}
    </>
  )
}
