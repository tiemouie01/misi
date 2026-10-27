'use client'

import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { cn } from '#/lib/utils'

import type { ComponentProps } from 'react'

/** The dim, ground-tinted backdrop behind dialogs and alert dialogs. */
export const dialogOverlayClassName =
  'fixed inset-0 z-50 bg-(--scrim) backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0'

/** A centered dialog surface: the framed, solid card the pages use. */
export const dialogSurfaceClassName =
  'fixed top-1/2 left-1/2 z-50 grid w-full min-w-0 grid-cols-[minmax(0,1fr)] max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-3xl border-6 border-(--card-frame) bg-(--card-solid) bg-clip-padding p-6 text-sea-ink shadow-(--card-lift) outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'

function Dialog({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(dialogOverlayClassName, className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  sheet = false,
  onOpenAutoFocus,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  /** Bottom sheet below `sm`; pair with `<DialogFooter sticky>` for reachable actions. */
  sheet?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          dialogSurfaceClassName,
          'sm:max-w-lg',
          sheet && [
            'p-(--dialog-p) pb-(--dialog-pb) [--dialog-p:1.25rem] [--dialog-pb:max(var(--dialog-p),env(safe-area-inset-bottom))] sm:[--dialog-p:1.5rem]',
            // On phones the frame shows only along the top edge.
            'max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[92dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-3xl max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0',
            'max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom',
          ],
          className,
        )}
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event)
          // Focusing a field on touch devices opens the keyboard over the dialog.
          if (event.defaultPrevented) return
          if (!window.matchMedia('(pointer: coarse)').matches) return
          event.preventDefault()
          if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.focus()
          }
        }}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-lagoon-deep/10 text-sea-ink-soft transition hover:bg-lagoon-deep/16 hover:text-sea-ink focus-visible:ring-2 focus-visible:ring-lagoon/55 focus-visible:outline-none sm:size-9"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 pr-10 text-left', className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  sticky = false,
  ...props
}: ComponentProps<'div'> & {
  /** Pins actions to the bottom of a scrolling `sheet` dialog. */
  sticky?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        sticky &&
          'sticky -bottom-(--dialog-pb) z-10 -mx-(--dialog-p) -mb-(--dialog-pb) border-t border-(--line) bg-(--card-solid) px-(--dialog-p) pt-3 pb-(--dialog-pb)',
        className,
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        'text-xl leading-tight font-bold tracking-tight text-sea-ink',
        className,
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-sea-ink-soft', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
