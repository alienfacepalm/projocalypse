import type { Developer } from '@/models/types'
import { developerInitials } from '@/lib/developer'
import { cn } from '@/lib/utils'

interface DeveloperBadgeProps {
  developer: Pick<Developer, 'name' | 'color' | 'initials'>
  size?: 'sm' | 'md'
  title?: string
  className?: string
}

export function DeveloperBadge({ developer, size = 'sm', title, className }: DeveloperBadgeProps) {
  const initials = developerInitials(developer)
  const sizeClass = size === 'sm' ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center border border-border/80 font-display font-bold uppercase leading-none text-white shadow-hud-sm',
        sizeClass,
        className,
      )}
      style={{ backgroundColor: developer.color }}
      title={title ?? developer.name}
      aria-label={title ?? `Assigned to ${developer.name}`}
    >
      {initials}
    </span>
  )
}
