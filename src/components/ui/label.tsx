import { forwardRef, type ElementRef, type ComponentPropsWithoutRef } from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

const Label = forwardRef<
  ElementRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('font-display text-[10px] font-bold uppercase tracking-widest text-accent2', className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
