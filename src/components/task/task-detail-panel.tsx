import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useConfirm } from '@/context/confirm-context'
import { CalendarIcon, Flag, Layers, Trash2, Type, User } from 'lucide-react'
import { format } from 'date-fns'
import { db } from '@/db/schema'
import { deleteTask, setTaskAssignee, setTaskPriority, toggleTaskComplete, updateTask } from '@/db/operations'
import { useProjectActor } from '@/context/active-developer-context'
import { useTaskPanel } from '@/context/task-panel-context'
import type { Priority, Task } from '@/models/types'
import { developerDisplayName } from '@/lib/developer'
import { hasPermission } from '@/lib/permissions'
import { cn, priorityLabel } from '@/lib/utils'
import { DeveloperBadge } from '@/components/developer/developer-badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { SubtaskList } from './subtask-list'

const PRIORITIES: Priority[] = ['none', 'low', 'medium', 'high']

function TaskDetailForm({ task }: { task: Task }) {
  const { closeTask } = useTaskPanel()
  const actor = useProjectActor(task.projectId)
  const { confirm } = useConfirm()
  const project = useLiveQuery(() => db.projects.get(task.projectId), [task.projectId])
  const sections = useLiveQuery(
    () => db.sections.where('projectId').equals(task.projectId).sortBy('sortOrder'),
    [task.projectId],
  )
  const developers = useLiveQuery(
    () => db.developers.where('projectId').equals(task.projectId).sortBy('sortOrder'),
    [task.projectId],
  )
  const assignee = useLiveQuery(
    () => (task.assigneeId ? db.developers.get(task.assigneeId) : undefined),
    [task.assigneeId],
  )
  const canAssign = actor ? hasPermission(actor, 'assignTasks') : false
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)

  async function saveTitle() {
    const trimmed = title.trim()
    if (trimmed && trimmed !== task.title) {
      await updateTask(task.id, { title: trimmed })
    } else {
      setTitle(task.title)
    }
  }

  async function saveDescription() {
    if (description !== task.description) {
      await updateTask(task.id, { description })
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete task',
      description: 'Delete this task and its subtasks?',
      confirmLabel: 'Delete',
      variant: 'destructive',
      icon: Trash2,
    })
    if (!ok) return
    await deleteTask(task.id)
    closeTask()
  }

  return (
    <>
      <SheetHeader>
        {project && (
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
            {project.name}
          </div>
        )}
      </SheetHeader>

      <div className="mt-4 space-y-6">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => toggleTaskComplete(task)}
            className="mt-1"
          />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
            className={cn(
              'border-transparent px-0 font-display text-base font-bold uppercase tracking-wide shadow-none focus-visible:border-primary',
              task.completed && 'line-through text-muted-foreground',
            )}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5" />
            Description
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            placeholder="What is this task about?"
            rows={4}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              Section
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="max-w-[180px] truncate">
                  {sections?.find((section) => section.id === task.sectionId)?.name ?? 'Section'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {sections?.map((section) => (
                  <DropdownMenuItem
                    key={section.id}
                    onClick={() => updateTask(task.id, { sectionId: section.id })}
                  >
                    {section.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              Due date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {task.dueDate ? format(new Date(task.dueDate), 'PPP') : 'No due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={task.dueDate ? new Date(task.dueDate) : undefined}
                  onSelect={(date) => updateTask(task.id, { dueDate: date ? date.getTime() : null })}
                />
                {task.dueDate && (
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => updateTask(task.id, { dueDate: null })}
                    >
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Assignee
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 max-w-[200px]" disabled={!canAssign || !actor}>
                  {assignee ? (
                    <>
                      <DeveloperBadge developer={assignee} />
                      <span className="truncate">{developerDisplayName(assignee)}</span>
                    </>
                  ) : (
                    <>
                      <User className="h-3.5 w-3.5" />
                      Unassigned
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {!canAssign || !actor ? (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    You cannot assign tasks
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => setTaskAssignee(actor, task.id, null)}>Unassigned</DropdownMenuItem>
                    {developers?.map((developer) => (
                      <DropdownMenuItem key={developer.id} onClick={() => setTaskAssignee(actor, task.id, developer.id)}>
                        <DeveloperBadge developer={developer} className="mr-2" />
                        {developer.name}
                      </DropdownMenuItem>
                    ))}
                    {(developers?.length ?? 0) === 0 && (
                      <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        Add developers in Settings
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flag className="h-3.5 w-3.5" />
              Priority
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Flag className="h-3.5 w-3.5" />
                  {priorityLabel(task.priority)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {PRIORITIES.map((p) => (
                  <DropdownMenuItem key={p} onClick={() => setTaskPriority(task.id, p)}>
                    {priorityLabel(p)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <SubtaskList taskId={task.id} />

        <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete task
        </Button>
      </div>
    </>
  )
}

export function TaskDetailPanel() {
  const { selectedTaskId, closeTask } = useTaskPanel()
  const task = useLiveQuery(() => (selectedTaskId ? db.tasks.get(selectedTaskId) : undefined), [selectedTaskId])

  return (
    <Sheet open={!!selectedTaskId} onOpenChange={(open) => !open && closeTask()}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetTitle className="sr-only">Task details</SheetTitle>
        {task && <TaskDetailForm key={task.id} task={task} />}
      </SheetContent>
    </Sheet>
  )
}
