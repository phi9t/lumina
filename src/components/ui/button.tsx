import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-900 hover:bg-white',
        secondary:
          'border border-slate-600/40 bg-slate-900/60 text-slate-200 hover:border-teal-400/30 hover:bg-slate-800/80 hover:shadow-[0_0_24px_rgba(45,212,191,0.12)]',
        glow:
          'border border-teal-400/25 bg-gradient-to-b from-teal-500/20 to-cyan-500/10 text-teal-100 shadow-[0_0_32px_rgba(45,212,191,0.15)] hover:border-teal-300/40 hover:shadow-[0_0_40px_rgba(45,212,191,0.25)]',
      },
      size: {
        default: 'h-11 px-5 py-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button }
