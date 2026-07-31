import { cva } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '#/lib/utils'

import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-1 text-[0.7rem] leading-none font-bold tracking-wide whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-lagoon/40 focus-visible:outline-none [&_svg]:pointer-events-none [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-(--chip-line) bg-(--chip-bg) text-lagoon-deep',
        secondary: 'border-(--chip-line) bg-(--chip-bg) text-sea-ink-soft',
        outline: 'border-(--chip-line) bg-transparent text-sea-ink',
        success: 'border-palm/20 bg-palm/12 text-palm',
        destructive: 'border-transparent bg-destructive/12 text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
