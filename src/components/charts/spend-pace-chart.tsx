import { useState } from 'react'

import { formatKCompact } from '#/lib/app-data'
import { cn } from '#/lib/utils'

import type { KeyboardEvent, PointerEvent } from 'react'
import type { CycleSpend } from '../../../shared/cycle-spend'

const DAY_MS = 86_400_000

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Blantyre',
})

export type PaceTone = 'calm' | 'fast' | 'over'

const TONE_COLOR: Record<PaceTone, string> = {
  calm: 'var(--lagoon-deep)',
  fast: 'var(--sun)',
  over: 'var(--coral)',
}

interface SpendPaceChartProps {
  spend: CycleSpend
  plan: number
  tone: PaceTone
  className?: string
}

/**
 * Spending so far against an even pace to payday, drawn for the teal ground.
 * Plot space is a 0–100 square stretched to fit; lines keep their width with
 * `non-scaling-stroke`, and round marks are HTML placed by percent so they
 * never stretch.
 */
export function SpendPaceChart({
  spend: { cumulative, totalDays, projected, startsAt },
  plan,
  tone,
  className,
}: SpendPaceChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const today = cumulative.length - 1
  if (today < 0 || plan <= 0) return null

  const spent = cumulative[today]
  const yMax = Math.max(plan, spent, projected ?? 0) * 1.08
  const x = (day: number) => ((day + 1) / totalDays) * 100
  const y = (amount: number) => 100 - (amount / yMax) * 100
  const paceAt = (day: number) => (plan * (day + 1)) / totalDays
  const color = TONE_COLOR[tone]

  const points = [
    '0,100',
    ...cumulative.map((amount, day) => `${x(day)},${y(amount)}`),
  ]
  const area = `M${points.join(' L')} L${x(today)},100 Z`

  const dateOf = (day: number) =>
    dayFormat.format(new Date(startsAt + day * DAY_MS))
  const payday = dateOf(totalDays)
  const evenPace = paceAt(today)

  const summary = `Spending against an even pace to payday. ${formatKCompact(spent)} spent by day ${today + 1} of ${totalDays}; an even pace would be ${formatKCompact(evenPace)}.${
    projected === null
      ? ''
      : ` At this rate you'd spend about ${formatKCompact(projected)} by payday, against a plan of ${formatKCompact(plan)}.`
  }`

  const shown = active ?? today
  const readout =
    active === null
      ? null
      : `${dateOf(active)}: ${formatKCompact(cumulative[active])} spent, even pace ${formatKCompact(paceAt(active))}`

  function pick(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    const fraction = (event.clientX - box.left) / Math.max(1, box.width)
    const day = Math.round(fraction * totalDays) - 1
    setActive(Math.min(today, Math.max(0, day)))
  }

  function step(event: KeyboardEvent<HTMLDivElement>) {
    const delta =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0) return
    event.preventDefault()
    setActive((day) => Math.min(today, Math.max(0, (day ?? today) + delta)))
  }

  return (
    <figure className={cn('m-0', className)}>
      <div
        role="group"
        tabIndex={0}
        aria-label="Spending pace chart. Use the arrow keys to step through days."
        className="relative h-20 touch-pan-y rounded-sm outline-offset-4 sm:h-24"
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setActive(null)}
        onKeyDown={step}
        onBlur={() => setActive(null)}
      >
        <svg
          role="img"
          aria-label={summary}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          {/* Plan level and baseline: recessive hairlines. */}
          <line
            x1="0"
            x2="100"
            y1={y(plan)}
            y2={y(plan)}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="0"
            x2="100"
            y1="100"
            y2="100"
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="0"
            y1="100"
            x2="100"
            y2={y(plan)}
            stroke="var(--sea-ink-soft)"
            strokeOpacity="0.55"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <path d={area} fill={color} fillOpacity="0.14" />
          {projected === null ? null : (
            <line
              x1={x(today)}
              y1={y(spent)}
              x2="100"
              y2={y(projected)}
              stroke={color}
              strokeOpacity="0.7"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {active === null ? null : (
            <line
              x1={x(active)}
              x2={x(active)}
              y1="0"
              y2="100"
              stroke="var(--sea-ink-soft)"
              strokeOpacity="0.5"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        <span
          aria-hidden
          className="pointer-events-none absolute right-0 -translate-y-full pb-0.5 text-[0.7rem] font-semibold text-sea-ink-soft"
          style={{ top: `${y(plan)}%` }}
        >
          Plan
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full shadow-[0_0_0_2px_var(--ground-a)]"
          style={{
            left: `${x(shown)}%`,
            top: `${y(cumulative[shown])}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <figcaption className="mt-1.5 flex items-start justify-between gap-3 text-[0.75rem] text-sea-ink-soft">
        <span className="shrink-0 tabular-nums">{dateOf(0)}</span>
        {/* While a day is picked its figures take the legend's place. */}
        <span
          aria-live="polite"
          className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-center"
        >
          {readout ?? (
            <>
              <LineKey color={color} label="Spent" />
              <LineKey color="var(--sea-ink-soft)" label="Even pace" />
              {projected === null ? null : (
                <LineKey
                  color={color}
                  dashed
                  label={`At this rate ${formatKCompact(projected)}`}
                />
              )}
            </>
          )}
        </span>
        <span className="shrink-0 tabular-nums">{payday}</span>
      </figcaption>
    </figure>
  )
}

function LineKey({
  color,
  label,
  dashed = false,
}: {
  color: string
  label: string
  dashed?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden
        className={cn(
          'w-3.5',
          dashed ? 'border-t-2 border-dashed' : 'h-0.5 rounded-full',
        )}
        style={dashed ? { borderColor: color } : { backgroundColor: color }}
      />
      {label}
    </span>
  )
}
