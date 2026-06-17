import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { createSubtask, deleteSubtask, updateSubtask } from '@/db/operations'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'

interface SubtaskListProps {
  taskId: string
}

export function SubtaskList({ taskId }: SubtaskListProps) {
  const subtasks = useLiveQuery(() => db.subtasks.where('taskId').equals(taskId).sortBy('sortOrder'), [taskId])
  const [newTitle, setNewTitle] = useState('')
  const [subtaskToDelete, setSubtaskToDelete] = useState<{ id: string; title: string } | null>(null)

  async function handleAdd() {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    await createSubtask(taskId, trimmed)
    setNewTitle('')
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subtasks</div>
      {subtasks?.map((subtask) => (
        <div key={subtask.id} className="group flex items-center gap-2">
          <Checkbox
            checked={subtask.completed}
            onCheckedChange={(checked) => updateSubtask(subtask.id, { completed: !!checked })}
          />
          <span className={subtask.completed ? 'flex-1 line-through text-muted-foreground' : 'flex-1'}>
            {subtask.title}
          </span>
          <button
            type="button"
            className="text-xs text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
            onClick={() => setSubtaskToDelete({ id: subtask.id, title: subtask.title })}
          >
            Remove
          </button>
        </div>
      ))}
      <Input
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        onBlur={handleAdd}
        placeholder="Add subtask…"
        className="h-8 text-sm"
      />
      <ConfirmDialog
        open={subtaskToDelete !== null}
        onOpenChange={(open) => !open && setSubtaskToDelete(null)}
        title={`Remove "${subtaskToDelete?.title ?? 'this subtask'}"?`}
        description="This subtask will be permanently removed. This cannot be undone."
        confirmLabel="Remove subtask"
        destructive
        onConfirm={async () => {
          if (subtaskToDelete) await deleteSubtask(subtaskToDelete.id)
          setSubtaskToDelete(null)
        }}
      />
    </div>
  )
}
