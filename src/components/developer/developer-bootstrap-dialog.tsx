import { useState } from 'react'
import { Crown } from 'lucide-react'
import { useActiveDeveloper } from '@/context/active-developer-context'
import { useEmbed } from '@/context/embed-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function DeveloperBootstrapDialog() {
  const { productName, embedded } = useEmbed()
  const { needsBootstrap, bootstrap, loading } = useActiveDeveloper()
  const [name, setName] = useState('You')
  const [submitting, setSubmitting] = useState(false)

  if (loading || !needsBootstrap) return null

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await bootstrap(name.trim() || 'You')
    } finally {
      setSubmitting(false)
    }
  }

  const title = embedded ? `Set up ${productName} team` : `Welcome to ${productName}`

  return (
    <Dialog open>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <p className="font-mono text-xs text-muted-foreground">
            Set up the Master Developer for this project on this device. Add team members and permissions
            later in Settings → Developers.
          </p>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="master-name">Your name</Label>
            <Input
              id="master-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="You"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleSubmit()
                }
              }}
            />
          </div>
          <Button className="w-full" onClick={() => void handleSubmit()} disabled={submitting}>
            Continue as Master Developer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
