import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'

import { cn } from '@/lib/utils'

const accentStyles = {
  cyan: {
    range: 'bg-gradient-to-r from-teal-500 to-cyan-400',
    thumb: 'border-cyan-400/80',
    ring: 'focus-visible:ring-cyan-400/60',
  },
  rose: {
    range: 'bg-gradient-to-r from-rose-500 to-pink-400',
    thumb: 'border-rose-400/80',
    ring: 'focus-visible:ring-rose-400/60',
  },
  amber: {
    range: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    thumb: 'border-amber-400/80',
    ring: 'focus-visible:ring-amber-400/60',
  },
  violet: {
    range: 'bg-gradient-to-r from-violet-500 to-purple-400',
    thumb: 'border-violet-400/80',
    ring: 'focus-visible:ring-violet-400/60',
  },
} as const

export type SliderAccent = keyof typeof accentStyles

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { accent?: SliderAccent }
>(({ className, accent = 'cyan', ...props }, ref) => {
  const styles = accentStyles[accent]
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn('relative flex w-full touch-none select-none items-center py-1', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-800/80">
        <SliderPrimitive.Range className={cn('absolute h-full rounded-full', styles.range)} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={cn(
          'block h-4 w-4 rounded-full border-2 bg-slate-950 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2',
          styles.thumb,
          styles.ring,
        )}
      />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
