import { cn } from '#/lib/utils'

import type { ComponentProps } from 'react'

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full min-w-0 rounded-xl border border-(--chip-line) bg-(--chip-bg) px-3 py-2 text-sm text-sea-ink shadow-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-sea-ink-soft/70 selection:bg-lagoon selection:text-sea-ink',
        'file:mr-3 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-sea-ink',
        'focus-visible:border-lagoon-deep focus-visible:ring-2 focus-visible:ring-lagoon/25',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
