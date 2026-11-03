import { formatK } from '#/lib/app-data'
import { cn } from '#/lib/utils'

const DAY_MS = 86_400_000

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Blantyre',
})

interface DailySpendBarsProps {
  /** Spend per day, oldest first, ending today; null before the cycle. */
  days: ReadonlyArray<number | null>
  /** Start of today's cycle day. */
  todayStartsAt: number
  /** The daily amount the bars are read against. */
  perDay: number
  className?: string
}

/** Recent days' spending as small columns against the daily amount. Days
    above it turn amber; position carries the meaning, colour backs it up. */
export function DailySpendBars({
  days,
  todayStartsAt,
  perDay,
  className,
}: DailySpendBarsProps) {
  const top = Math.max(perDay, ...days.map((day) => day ?? 0)) * 1.1 || 1
  const dateOf = (index: number) =>
    dayFormat
      .format(new Date(todayStartsAt - (days.length - 1 - index) * DAY_MS))
      .replace(',', '')
  const counted = days.filter((day): day is number => day !== null)
  const over = counted.filter((day) => day > perDay).length

  const summary = `Spending on each of the last ${counted.length} days: ${days
    .flatMap((day, index) =>
      day === null ? [] : [`${dateOf(index)} ${formatK(day)}`],
    )
    .join(', ')}. ${over} of ${counted.length} above ${formatK(perDay)} a day.`

  return (
    <figure className={cn('m-0', className)}>
      <div
        role="img"
        aria-label={summary}
        className="relative flex h-9 items-end gap-[3px]"
      >
        {days.map((day, index) => (
          <div
            key={index}
            className="flex h-full min-w-0 flex-1 items-end justify-center"
            title={
              day === null ? undefined : `${dateOf(index)}: ${formatK(day)}`
            }
          >
            {day === null ? null : (
              <span
                className={cn(
                  'block w-full max-w-6 rounded-t-[4px]',
                  day === 0
                    ? 'h-0.5 bg-(--line)'
                    : day > perDay
                      ? 'bg-sun'
                      : 'bg-lagoon',
                )}
                style={
                  day > 0 ? { height: `${(day / top) * 100}%` } : undefined
                }
              />
            )}
          </div>
        ))}
        {perDay > 0 ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-sea-ink-soft/60"
            style={{ bottom: `${(perDay / top) * 100}%` }}
          />
        ) : null}
      </div>
      <figcaption className="mt-1 text-[0.7rem] text-sea-ink-soft sm:text-[0.75rem]">
        Last {days.length} days{' '}
        <span className="whitespace-nowrap">
          · <span aria-hidden>┄</span> daily amount
        </span>
      </figcaption>
    </figure>
  )
}
