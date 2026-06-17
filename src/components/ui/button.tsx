import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-display text-xs font-bold uppercase tracking-widest transition-[transform,box-shadow,background-color,color,filter] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:translate-x-px active:translate-y-px',
  {
    variants: {
      variant: {
        default:
          'border border-primary bg-background text-primary shadow-hud hover:bg-primary hover:text-primary-foreground active:shadow-[3px_3px_0_0_var(--color-primary)]',
        destructive:
          'border border-destructive-foreground bg-destructive text-destructive-foreground shadow-[4px_4px_0_0_var(--color-destructive-foreground)] hover:brightness-110 active:shadow-[3px_3px_0_0_var(--color-destructive-foreground)]',
        outline:
          'border border-accent2 bg-transparent text-accent2 shadow-hud-magenta hover:bg-accent2 hover:text-primary-foreground active:shadow-[3px_3px_0_0_var(--color-accent2)]',
        secondary:
          'border border-border bg-secondary text-secondary-foreground shadow-[3px_3px_0_0_var(--color-border)] hover:bg-accent hover:text-accent-foreground active:shadow-[2px_2px_0_0_var(--color-border)]',
        ghost: 'border border-transparent shadow-none hover:bg-accent hover:text-accent-foreground active:translate-x-0 active:translate-y-0',
        link: 'border-0 text-primary underline decoration-2 underline-offset-2 shadow-none hover:text-accent2 active:translate-x-0 active:translate-y-0',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-[10px]',
        lg: 'h-10 px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
