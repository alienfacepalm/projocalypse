import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { importTalemailMvpBoard, TALEMAIL_MVP_PROJECT_ID } from '@/lib/talemail-import'

/** Handles ?import=talemail-mvp — loads bundled sprint board into IndexedDB. */
export function TalemailImportPrompt() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const startedRef = useRef(false)

  useEffect(() => {
    if (searchParams.get('import') !== 'talemail-mvp' || startedRef.current) return
    startedRef.current = true

    void (async () => {
      if (
        !confirm(
          'Import the Talemail MVP sprint board (136 tasks from the plan)? Replaces only the Talemail MVP project; other projects are kept.',
        )
      ) {
        const next = new URLSearchParams(searchParams)
        next.delete('import')
        setSearchParams(next, { replace: true })
        return
      }

      const next = new URLSearchParams(searchParams)
      next.delete('import')
      setSearchParams(next, { replace: true })

      try {
        const { taskCount } = await importTalemailMvpBoard()
        navigate(`/project/${TALEMAIL_MVP_PROJECT_ID}`, { replace: true })
        alert(`Talemail MVP imported — ${taskCount} tasks. Toggle “Show completed” to see shipped items.`)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Import failed.'
        alert(msg)
      }
    })()
  }, [navigate, searchParams, setSearchParams])

  return null
}
