import { Folder, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link, useLocation } from 'react-router-dom'
import type { Project } from '@/models/types'
import { cn } from '@/lib/utils'
import { sortableProjectId } from '@/lib/project-drag'

interface SortableProjectLinkProps {
  project: Project
  onNavigate?: () => void
}

export function SortableProjectLink({ project, onNavigate }: SortableProjectLinkProps) {
  const location = useLocation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableProjectId(project.id),
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-0.5">
      <button
        type="button"
        className="cursor-grab px-1 text-muted-foreground opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-60"
        aria-label={`Reorder ${project.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Link
        to={`/project/${project.id}`}
        onClick={onNavigate}
        className={cn(
          'group flex flex-1 items-center gap-2 border border-transparent px-2 py-2 font-sans text-sm transition-colors hover:border-primary hover:bg-accent hover:shadow-hud-sm',
          location.pathname === `/project/${project.id}` &&
            'border-primary bg-accent font-medium text-accent-foreground shadow-hud-sm',
        )}
      >
        <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border/60"
          style={{ backgroundColor: project.color }}
        />
        <span className="truncate">{project.name}</span>
      </Link>
    </div>
  )
}
