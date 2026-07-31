import { cva } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '#/lib/utils'

import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold no-underline transition-[background-color,border-color,color,box-shadow,transform,filter] outline-none select-none focus-visible:ring-2 focus-visible:ring-lagoon/55 focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-base) disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        default:
          'btn-primary shadow-md hover:-translate-y-0.5 hover:brightness-110 hover:shadow-lg active:translate-y-0 active:brightness-95',
        secondary:
          'border border-(--chip-line) bg-(--chip-bg) text-sea-ink shadow-sm hover:border-lagoon-deep hover:bg-(--link-bg-hover) hover:text-sea-ink',
        outline:
          'border border-(--chip-line) bg-transparent text-sea-ink hover:border-lagoon-deep hover:bg-(--chip-bg) hover:text-sea-ink',
        ghost:
          'text-sea-ink-soft shadow-none hover:bg-(--chip-bg) hover:text-sea-ink',
        destructive:
          'bg-destructive text-white shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/35',
        link: 'rounded-none p-0 text-lagoon-deep underline-offset-4 shadow-none hover:text-(--link-hover) hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 gap-1.5 px-3 text-xs',
        lg: 'h-12 px-7 text-base',
        icon: 'size-10 p-0',
        'icon-sm': 'size-8 p-0',
        'icon-lg': 'size-12 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
