'use client'

import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import { createContext, useContext } from 'react'

import { toggleVariants } from '#/components/ui/toggle'
import { cn } from '#/lib/utils'

import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

type ToggleGroupVariants = VariantProps<typeof toggleVariants>

const ToggleGroupContext = createContext<ToggleGroupVariants>({
  size: 'default',
  variant: 'default',
})

/**
 * A segmented pill, styled like `TabsList` and the header nav: the selected
 * item takes the lagoon highlight.
 */
function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Root> & ToggleGroupVariants) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        'inline-flex w-fit items-center gap-0.5 rounded-full border border-(--chip-line) bg-(--chip-bg) p-1',
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  variant,
  size,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item> & ToggleGroupVariants) {
  const context = useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant ?? variant}
      data-size={context.size ?? size}
      className={cn(
        toggleVariants({
          variant: context.variant ?? variant,
          size: context.size ?? size,
        }),
        'min-w-0 focus-visible:z-10',
        className,
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
