import { useCallback, useEffect, useState } from 'react'
import { Rocket } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useActiveDeveloper } from '@/context/active-developer-context'
import { useEmbed } from '@/context/embed-context'
import {
  applyPendingSync,
  createHostProject,
  fetchPendingSync,
  readHostLinkProjectId,
  writeHostLinkProjectId,
} from '@/lib/host-bridge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PendingSync } from '@projocalypse/core'

type WizardStep = 'link' | 'import' | 'done'

const DEFAULT_SECTIONS = ['Backlog', 'Sprint', 'In Review', 'Done']

function initialLinkedProjectId(
  hostProjectId: string | null,
  packageName: string | null,
  hostEntityId: string | null,
): string | null {
  if (hostProjectId) return hostProjectId
  if (!packageName) return null
  return readHostLinkProjectId(packageName, hostEntityId)
}

export function HostSetupWizard() {
  const navigate = useNavigate()
  const {
    embedded,
    packageName,
    hostEntityId,
    hostProjectId,
    productName,
    pendingSyncUrl,
    onProjectLinked,
  } = useEmbed()
  const { needsBootstrap, loading: devLoading } = useActiveDeveloper()

  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(() =>
    initialLinkedProjectId(hostProjectId, packageName, hostEntityId),
  )
  const [step, setStep] = useState<WizardStep>(() =>
    initialLinkedProjectId(hostProjectId, packageName, hostEntityId) ? 'import' : 'link',
  )
  const [pending, setPending] = useState<PendingSync | null>(null)
  const [busy, setBusy] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  const shouldRun =
    embedded && packageName && !hostProjectId && !needsBootstrap && !devLoading

  useEffect(() => {
    if (!shouldRun || step !== 'import' || !pendingSyncUrl) return
    void fetchPendingSync(pendingSyncUrl).then(setPending)
  }, [shouldRun, step, pendingSyncUrl])

  const handleCreateProject = useCallback(async () => {
    if (!packageName) return
    setBusy(true)
    try {
      const project = await createHostProject(productName || packageName, DEFAULT_SECTIONS)
      writeHostLinkProjectId(packageName, project.id, hostEntityId)
      onProjectLinked?.(project.id)
      setLinkedProjectId(project.id)
      setStep('import')
    } finally {
      setBusy(false)
    }
  }, [packageName, productName, hostEntityId, onProjectLinked])

  const handleImport = useCallback(async () => {
    if (!linkedProjectId || !pending) return
    setBusy(true)
    try {
      const result = await applyPendingSync(linkedProjectId, pending)
      setImportResult(`${result.created} created, ${result.updated} updated`)
      setStep('done')
      navigate(`/project/${linkedProjectId}`)
    } finally {
      setBusy(false)
    }
  }, [linkedProjectId, pending, navigate])

  const handleSkipImport = useCallback(() => {
    if (linkedProjectId) navigate(`/project/${linkedProjectId}`)
    setStep('done')
  }, [linkedProjectId, navigate])

  if (!shouldRun || step === 'done') return null
  if (needsBootstrap || devLoading) return null

  return (
    <Dialog open>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Rocket className="h-5 w-5 text-primary" />
            Set up {productName}
          </DialogTitle>
          <p className="font-mono text-xs text-muted-foreground">
            Package {packageName} — link Projocalypse to this host and import sprint tasks from your plan.
          </p>
        </DialogHeader>

        {step === 'link' && (
          <div className="space-y-4">
            <p className="font-mono text-sm text-muted-foreground">
              Create a Projocalypse project for this host. The host app should persist the returned project id.
            </p>
            <Button className="w-full" onClick={() => void handleCreateProject()} disabled={busy}>
              Create project & continue
            </Button>
          </div>
        )}

        {step === 'import' && (
          <div className="space-y-4">
            {pending && pending.upserts.length > 0 ? (
              <>
                <p className="font-mono text-sm">
                  {pending.upserts.length} task(s) ready from plan sync.
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto font-mono text-xs">
                  {pending.upserts.slice(0, 8).map((upsert) => (
                    <li key={upsert.planItemId}>
                      [{upsert.planItemId}] {upsert.title} → {upsert.sectionName}
                    </li>
                  ))}
                  {pending.upserts.length > 8 && (
                    <li className="text-muted-foreground">…and {pending.upserts.length - 8} more</li>
                  )}
                </ul>
                <Button className="w-full" onClick={() => void handleImport()} disabled={busy}>
                  Import tasks
                </Button>
                <Button variant="outline" className="w-full" onClick={handleSkipImport}>
                  Skip for now
                </Button>
              </>
            ) : (
              <>
                <p className="font-mono text-sm text-muted-foreground">
                  No pending plan sync found{pendingSyncUrl ? ` at ${pendingSyncUrl}` : ''}. Run{' '}
                  <code className="text-primary">pnpm pm:sync --package {packageName}</code> in the monorepo, then
                  reload.
                </p>
                <Button className="w-full" onClick={handleSkipImport}>
                  Open board
                </Button>
              </>
            )}
            {importResult && (
              <p className="font-mono text-xs text-muted-foreground">{importResult}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
