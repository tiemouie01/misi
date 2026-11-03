import { cn } from '#/lib/utils'

export interface SplitBarPart {
  key: string
  label: string
  /** Share of the whole, 0–100. */
  percent: number
  color: string
  /** Shown on hover; defaults to the percent. */
  detail?: string
}

/** A thin bar split into parts, separated by a 2px gap. The caller labels it;
    hover and the accessible name give each part. */
export function SplitBar({
  parts,
  label,
  className,
}: {
  parts: readonly SplitBarPart[]
  label: string
  className?: string
}) {
  const shown = parts.filter((part) => part.percent > 0)
  return (
    <div
      role="img"
      aria-label={`${label}: ${shown
        .map((part) => `${part.label} ${part.detail ?? `${part.percent}%`}`)
        .join(', ')}`}
      className={cn('flex h-2 gap-0.5 rounded-full bg-(--line)', className)}
    >
      {shown.map((part) => (
        <span
          key={part.key}
          className="h-full min-w-1 rounded-full"
          style={{
            flexGrow: part.percent,
            flexBasis: 0,
            backgroundColor: part.color,
          }}
          title={`${part.label}: ${part.detail ?? `${part.percent}%`}`}
        />
      ))}
    </div>
  )
}
