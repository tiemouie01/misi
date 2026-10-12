'use client'

import { Progress as ProgressPrimitive } from 'radix-ui'

import { cn } from '#/lib/utils'

import type { ComponentProps } from 'react'

function Progress({
  className,
  value,
  max = 100,
  ...props
}: ComponentProps<typeof ProgressPrimitive.Root>) {
  const numericValue = typeof value === 'number' ? value : 0
  const numericMax = typeof max === 'number' && max > 0 ? max : 100
  const percentage = Math.min(
    100,
    Math.max(0, (numericValue / numericMax) * 100),
  )

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      max={max}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-(--line)',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full rounded-full bg-linear-to-r from-lagoon to-palm transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
