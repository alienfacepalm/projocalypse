import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import { importTalemailMvpBoard, TALEMAIL_MVP_PROJECT_ID } from '@/lib/talemail-import'
import { Button } from '@/components/ui/button'

export function TalemailBoardEmptyState() {
  const navigate = useNavigate()
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      const { taskCount } = await importTalemailMvpBoard()
      navigate(`/project/${TALEMAIL_MVP_PROJECT_ID}`, { replace: true })
      alert(`Talemail board loaded — ${taskCount} tasks across 9 sprint sections. Toggle “Show completed” for shipped work.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-lg rounded-xl border border-border/80 bg-card/70 p-8 text-center shadow-sm">
        <LayoutGrid className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h2 className="font-display text-xl font-semibold tracking-tight">Load Talemail sprint board</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This project is empty. Import the full MVP plan — <strong>136 tasks</strong> in sprint sections (Shipped, Sprint
          0–5, Blocked, Backlog) with statuses from the plan.
        </p>
        <Button className="mt-6" onClick={handleImport} disabled={importing}>
          {importing ? 'Importing…' : 'Import Talemail board'}
        </Button>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <p className="mt-4 text-xs text-muted-foreground">
          Also available under Settings → Import Talemail MVP board
        </p>
      </div>
    </div>
  )
}
