import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type ComponentType,
} from 'react'
import { AlertTriangle, HelpCircle, type LucideIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  icon?: LucideIcon
}

export type AlertOptions = {
  title: string
  description?: string
  confirmLabel?: string
  variant?: 'error' | 'info'
  icon?: LucideIcon
}

export type PromptOptions = {
  title: string
  label?: string
  placeholder?: string
  defaultValue?: string
  confirmLabel?: string
  cancelLabel?: string
  icon?: LucideIcon
}

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions) => Promise<void>
  prompt: (options: PromptOptions) => Promise<string | null>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

type ActiveConfirm = ConfirmOptions & { kind: 'confirm'; resolve: (value: boolean) => void }
type ActiveAlert = AlertOptions & { kind: 'alert'; resolve: () => void }
type ActivePrompt = PromptOptions & { kind: 'prompt'; resolve: (value: string | null) => void; inputValue: string }

type ActiveDialog = ActiveConfirm | ActiveAlert | ActivePrompt

function DialogIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return <Icon className={cn('h-5 w-5 shrink-0 text-primary', className)} aria-hidden />
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null)
  const activeRef = useRef<ActiveDialog | null>(null)

  const closeActive = useCallback(() => {
    activeRef.current = null
    setActive(null)
  }, [])

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const entry: ActiveConfirm = {
        kind: 'confirm',
        ...options,
        resolve: (value) => {
          resolve(value)
          closeActive()
        },
      }
      activeRef.current = entry
      setActive(entry)
    })
  }, [closeActive])

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      const entry: ActiveAlert = {
        kind: 'alert',
        ...options,
        resolve: () => {
          resolve()
          closeActive()
        },
      }
      activeRef.current = entry
      setActive(entry)
    })
  }, [closeActive])

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      const entry: ActivePrompt = {
        kind: 'prompt',
        inputValue: options.defaultValue ?? '',
        ...options,
        resolve: (value) => {
          resolve(value)
          closeActive()
        },
      }
      activeRef.current = entry
      setActive(entry)
    })
  }, [closeActive])

  const handleConfirmOpenChange = (open: boolean) => {
    if (!open && active?.kind === 'confirm') {
      active.resolve(false)
    }
  }

  const handleAlertOpenChange = (open: boolean) => {
    if (!open && active?.kind === 'alert') {
      active.resolve()
    }
  }

  const handlePromptOpenChange = (open: boolean) => {
    if (!open && active?.kind === 'prompt') {
      active.resolve(null)
    }
  }

  const confirmIcon = active?.kind === 'confirm' ? (active.icon ?? HelpCircle) : HelpCircle
  const alertIcon =
    active?.kind === 'alert'
      ? (active.icon ?? (active.variant === 'error' ? AlertTriangle : HelpCircle))
      : HelpCircle
  const promptIcon = active?.kind === 'prompt' ? (active.icon ?? HelpCircle) : HelpCircle

  return (
    <ConfirmContext.Provider value={{ confirm, alert, prompt }}>
      {children}

      <AlertDialog open={active?.kind === 'confirm'} onOpenChange={handleConfirmOpenChange}>
        {active?.kind === 'confirm' && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <DialogIcon icon={confirmIcon} />
                {active.title}
              </AlertDialogTitle>
              {active.description && <AlertDialogDescription>{active.description}</AlertDialogDescription>}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => active.resolve(false)}>
                {active.cancelLabel ?? 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction
                className={active.variant === 'destructive' ? 'border-destructive-foreground bg-destructive text-destructive-foreground shadow-[4px_4px_0_0_var(--color-destructive-foreground)] hover:brightness-110' : undefined}
                onClick={() => active.resolve(true)}
              >
                {active.confirmLabel ?? 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <AlertDialog open={active?.kind === 'alert'} onOpenChange={handleAlertOpenChange}>
        {active?.kind === 'alert' && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle
                className={cn(
                  'flex items-center gap-2',
                  active.variant === 'error' && 'text-destructive',
                )}
              >
                <DialogIcon
                  icon={alertIcon}
                  className={active.variant === 'error' ? 'text-destructive' : undefined}
                />
                {active.title}
              </AlertDialogTitle>
              {active.description && <AlertDialogDescription>{active.description}</AlertDialogDescription>}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => active.resolve()}>
                {active.confirmLabel ?? 'OK'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <Dialog open={active?.kind === 'prompt'} onOpenChange={handlePromptOpenChange}>
        {active?.kind === 'prompt' && (
          <PromptDialogBody
            active={active}
            icon={promptIcon}
            onInputChange={(value) => {
              setActive((current) =>
                current?.kind === 'prompt' ? { ...current, inputValue: value } : current,
              )
            }}
            onSubmit={() => {
              const trimmed = active.inputValue.trim()
              active.resolve(trimmed || null)
            }}
            onCancel={() => active.resolve(null)}
          />
        )}
      </Dialog>
    </ConfirmContext.Provider>
  )
}

function PromptDialogBody({
  active,
  icon: Icon,
  onInputChange,
  onSubmit,
  onCancel,
}: {
  active: ActivePrompt
  icon: ComponentType<{ className?: string }>
  onInputChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <DialogContent
      onPointerDownOutside={(event) => event.preventDefault()}
      onInteractOutside={(event) => event.preventDefault()}
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          {active.title}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          {active.label && <Label htmlFor="confirm-prompt-input">{active.label}</Label>}
          <Input
            id="confirm-prompt-input"
            value={active.inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={active.placeholder}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSubmit()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                onCancel()
              }
            }}
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            {active.cancelLabel ?? 'Cancel'}
          </Button>
          <Button type="button" onClick={onSubmit} disabled={!active.inputValue.trim()}>
            {active.confirmLabel ?? 'OK'}
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }
  return context
}
