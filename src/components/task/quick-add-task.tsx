import { useState } from 'react'
import { createTask } from '@/db/operations'
import { Input } from '@/components/ui/input'

interface QuickAddTaskProps {
  projectId: string
  sectionId: string
  placeholder?: string
}

export function QuickAddTask({ projectId, sectionId, placeholder = 'Add task…' }: QuickAddTaskProps) {
  const [title, setTitle] = useState('')

  async function handleSubmit() {
    const trimmed = title.trim()
    if (!trimmed) return
    await createTask(projectId, sectionId, trimmed)
    setTitle('')
  }

  return (
    <div className="px-3 py-1">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
          }
        }}
        onBlur={handleSubmit}
        placeholder={placeholder}
        className="border-transparent bg-transparent shadow-none focus-visible:border-input focus-visible:ring-1"
      />
    </div>
  )
}
