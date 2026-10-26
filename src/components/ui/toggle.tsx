import { cva } from 'class-variance-authority'
import { Toggle as TogglePrimitive } from 'radix-ui'

import { cn } from '#/lib/utils'

import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

const toggleVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-semibold whitespace-nowrap text-sea-ink-soft outline-none transition-[background-color,color,box-shadow] hover:text-sea-ink focus-visible:ring-2 focus-visible:ring-lagoon/40 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-lagoon-deep/15 data-[state=on]:font-bold data-[state=on]:text-lagoon-deep data-[state=on]:shadow-sm data-[state=on]:ring-1 data-[state=on]:ring-lagoon-deep/35 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-(--chip-line) bg-transparent hover:border-lagoon-deep hover:bg-(--chip-bg)',
      },
      size: {
        default: 'h-9 min-w-9 px-3',
        sm: 'h-8 min-w-8 px-2.5',
        lg: 'h-10 min-w-10 px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
