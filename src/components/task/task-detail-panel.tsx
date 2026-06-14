import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarIcon, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { db } from '@/db/schema'
import { deleteTask, setTaskPriority, toggleTaskComplete, updateTask } from '@/db/operations'
import { useTaskPanel } from '@/context/task-panel-context'
import type { Priority, Task } from '@/models/types'
import { cn, priorityLabel } from '@/lib/utils'
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
  const project = useLiveQuery(() => db.projects.get(task.projectId), [task.projectId])
  const sections = useLiveQuery(
    () => db.sections.where('projectId').equals(task.projectId).sortBy('sortOrder'),
    [task.projectId],
  )
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
    if (confirm('Delete this task and its subtasks?')) {
      await deleteTask(task.id)
      closeTask()
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">Task details</SheetTitle>
        {project && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
              'border-transparent px-0 text-lg font-semibold shadow-none focus-visible:border-input',
              task.completed && 'line-through text-muted-foreground',
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
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
            <Label className="text-xs text-muted-foreground">Section</Label>
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
            <Label className="text-xs text-muted-foreground">Due date</Label>
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
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
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
        {task && <TaskDetailForm key={task.id} task={task} />}
      </SheetContent>
    </Sheet>
  )
}
