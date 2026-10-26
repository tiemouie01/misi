'use client'

import { Progress as ProgressPrimitive } from 'radix-ui'

import { cn } from '#/lib/utils'

import type { ComponentProps } from 'react'

/** The water bar's right edge: a wave three bar-heights tall, so bobbing it
 * by one bar height loops. */
const WATER_EDGE = 'M0 0 H5 Q10 5 5 10 T5 20 T5 30 T5 40 T5 50 T5 60 H0 Z'

/** `water` draws the fill as water: a glint along the top and a wavy edge
 * that bobs. Its colour is `--water` (lagoon unless the caller sets it). */
function Progress({
  className,
  value,
  max = 100,
  variant = 'default',
  ...props
}: ComponentProps<typeof ProgressPrimitive.Root> & {
  variant?: 'default' | 'water'
}) {
  const numericValue = typeof value === 'number' ? value : 0
  const numericMax = typeof max === 'number' && max > 0 ? max : 100
  const percentage = Math.min(
    100,
    Math.max(0, (numericValue / numericMax) * 100),
  )
  const water = variant === 'water'

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      max={max}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-(--line)',
        water && 'h-3.5 [--water:var(--lagoon)]',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          'h-full w-full rounded-full bg-linear-to-r from-lagoon to-palm transition-transform duration-300 ease-out',
          water && 'relative rounded-r-none bg-none bg-(--water) duration-700',
        )}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      >
        {water && percentage > 0 ? (
          <>
            <span className="absolute top-[3px] right-0.5 left-[7px] h-0.5 rounded-full bg-white/50" />
            <svg
              aria-hidden
              viewBox="0 0 10 60"
              preserveAspectRatio="none"
              className="water-bob absolute -top-full -right-[9px] h-[300%] w-2.5 fill-(--water)"
            >
              <path d={WATER_EDGE} />
            </svg>
          </>
        ) : null}
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
