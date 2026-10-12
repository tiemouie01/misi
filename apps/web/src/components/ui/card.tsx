import { cva } from 'class-variance-authority'

import { cn } from '#/lib/utils'

import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

const cardVariants = cva(
  'flex flex-col gap-6 rounded-2xl border text-sea-ink',
  {
    variants: {
      variant: {
        default: 'border-(--line) bg-card shadow-sm',
        island: 'island-shell',
        subtle: 'border-(--chip-line) bg-(--chip-bg)',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Card({
  className,
  variant,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'font-display text-lg leading-none font-bold tracking-tight text-sea-ink',
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-sea-ink-soft', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-6', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 pb-6', className)}
      {...props}
    />
  )
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
}
