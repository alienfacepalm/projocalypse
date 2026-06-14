import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { db } from '@/db/schema'
import { useTaskPanel } from '@/context/task-panel-context'
import { searchEntities } from '@/lib/search'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export function GlobalSearch() {
  const navigate = useNavigate()
  const { openTask } = useTaskPanel()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const projects = useLiveQuery(() => db.projects.toArray(), [])
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])

  const results = useMemo(
    () => searchEntities(query, projects ?? [], tasks ?? []),
    [query, projects, tasks],
  )

  const showResults = focused && query.trim().length > 0

  function handleSelect(result: (typeof results)[number]) {
    setQuery('')
    setFocused(false)
    if (result.type === 'project') {
      navigate(`/project/${result.id}`)
    } else {
      openTask(result.id)
    }
  }

  return (
    <div className="relative px-2 pb-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search tasks & projects"
          className="h-8 pl-8 text-xs"
        />
      </div>
      {showResults && (
        <div className="absolute left-2 right-2 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
          ) : (
            results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                className={cn(
                  'flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent',
                )}
                onMouseDown={() => handleSelect(result)}
              >
                <span className="truncate font-medium">{result.title}</span>
                <span className="text-xs text-muted-foreground">
                  {result.type === 'project' ? 'Project' : result.subtitle ?? 'Task'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
