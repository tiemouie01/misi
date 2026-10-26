import { useId } from 'react'

import { Card } from '#/components/ui/card'
import { cn } from '#/lib/utils'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** The framed card every settings section sits in: an icon and title to scan
 * by, an optional one-line explanation, then the section's controls. */
export function SettingsSection({
  title,
  icon: Icon,
  description,
  className,
  children,
}: {
  title: string
  icon: LucideIcon
  description?: string
  className?: string
  children?: ReactNode
}) {
  const titleId = useId()

  return (
    <Card
      role="region"
      variant="panel"
      aria-labelledby={titleId}
      className={cn('min-w-0 gap-0 p-4 sm:p-5', className)}
    >
      <div className="flex items-start gap-3 px-1">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lagoon-deep/12 text-lagoon-deep">
          <Icon className="size-[1.125rem]" />
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h2
            id={titleId}
            className="text-lg leading-tight font-bold text-sea-ink"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-sea-ink-soft">{description}</p>
          ) : null}
        </div>
      </div>
      {children ? <div className="mt-4 px-1">{children}</div> : null}
    </Card>
  )
}
