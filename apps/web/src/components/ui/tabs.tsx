'use client'

import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '#/lib/utils'

import type { ComponentProps } from 'react'

function Tabs({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-10 w-fit items-center justify-center rounded-full border border-(--chip-line) bg-(--chip-bg) p-1 text-sea-ink-soft',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-sea-ink-soft outline-none transition-[background-color,color,box-shadow] hover:text-sea-ink focus-visible:ring-2 focus-visible:ring-lagoon/40 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-lagoon-deep/15 data-[state=active]:font-bold data-[state=active]:text-lagoon-deep data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-lagoon-deep/35 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'flex-1 outline-none focus-visible:ring-2 focus-visible:ring-lagoon/40',
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
