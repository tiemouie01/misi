import { useState } from 'react'

import { formatK } from '#/lib/app-data'
import { cn } from '#/lib/utils'

import type { KeyboardEvent, PointerEvent } from 'react'
import type { CycleSpend } from '../../../shared/cycle-spend'

const DAY_MS = 86_400_000

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Blantyre',
})

const edgeFormat = new Intl.DateTimeFormat('en-GB', {
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

/** Whole kwacha: an even-pace share like K92,903.23 is false precision. */
export function evenPaceBy(plan: number, day: number, totalDays: number) {
  return Math.round((plan * (day + 1)) / totalDays)
}

/** One plain sentence on how the cycle's spending compares with the plan. */
export function paceSentence({
  spend: { cumulative, today, totalDays },
  plan,
  closed,
}: {
  spend: CycleSpend
  plan: number
  closed: boolean
}) {
  const spent = cumulative.at(-1) ?? 0
  if (closed) {
    return spent > plan
      ? `You spent ${formatK(spent)}, ${formatK(spent - plan)} more than your ${formatK(plan)} plan.`
      : `You spent ${formatK(spent)} of your ${formatK(plan)} plan.`
  }
  if (spent > plan) {
    return `You’ve spent ${formatK(spent)}, ${formatK(spent - plan)} more than your ${formatK(plan)} plan.`
  }
  const even = evenPaceBy(plan, today, totalDays)
  const by = `You’ve spent ${formatK(spent)} by day ${today + 1} of ${totalDays}`
  const gap = spent - even
  if (Math.abs(gap) <= plan * 0.05) {
    return `${by}, close to an even pace of ${formatK(even)}.`
  }
  return gap > 0
    ? `${by}, ${formatK(gap)} ahead of an even pace.`
    : `${by}, ${formatK(-gap)} under an even pace.`
}

interface CycleSpendChartProps {
  spend: CycleSpend
  plan: number
  tone: PaceTone
  /** An ended cycle's readout names its last day instead of "Today". */
  closed?: boolean
  className?: string
}

/**
 * A cycle's running total against an even pace to payday, with each day's
 * spending as bars on the same day axis and one readout for both. Plot space
 * is a 0–100 square stretched to fit; lines keep their width with
 * `non-scaling-stroke`, and the dot is HTML placed by percent so it never
 * stretches.
 */
export function CycleSpendChart({
  spend: { daily, cumulative, totalDays, startsAt },
  plan,
  tone,
  closed = false,
  className,
}: CycleSpendChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const today = cumulative.length - 1
  if (today < 0 || plan <= 0) return null

  const yMax = Math.max(plan, cumulative[today]) * 1.08
  const barMax = Math.max(1, ...daily)
  // Days sit at the middle of their slot so the line and the bars line up.
  const x = (day: number) => ((day + 0.5) / totalDays) * 100
  const y = (amount: number) => 100 - (amount / yMax) * 100
  const color = TONE_COLOR[tone]
  const points = [
    '0,100',
    ...cumulative.map((amount, day) => `${x(day)},${y(amount)}`),
  ]
  const area = `M${points.join(' L')} L${x(today)},100 Z`
  const dateOf = (day: number) =>
    dayFormat.format(new Date(startsAt + day * DAY_MS)).replace(',', '')

  const shown = active ?? today
  const readout = `${active === null && !closed ? 'Today' : dateOf(shown)}: ${formatK(daily[shown])} spent, ${formatK(cumulative[shown])} so far (even pace ${formatK(evenPaceBy(plan, shown, totalDays))})`

  function pick(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    const fraction = (event.clientX - box.left) / Math.max(1, box.width)
    setActive(Math.min(today, Math.max(0, Math.floor(fraction * totalDays))))
  }

  function step(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && active !== null) {
      // Clear the picked day first; a second Escape can close a sheet.
      event.stopPropagation()
      setActive(null)
      return
    }
    const delta =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0) return
    event.preventDefault()
    setActive((day) => Math.min(today, Math.max(0, (day ?? today) + delta)))
  }

  return (
    <figure className={cn('m-0 min-w-0', className)}>
      <p
        aria-live="polite"
        className="min-h-[2.5em] text-sm text-sea-ink tabular-nums"
      >
        {readout}
      </p>
      <div
        role="group"
        tabIndex={0}
        aria-label="Spending chart. Use the arrow keys to step through days."
        className="relative mt-2 touch-pan-y rounded-sm outline-offset-4"
        onPointerMove={pick}
        onPointerDown={(event) => {
          // Safari doesn't focus on tap, and focus is what lets a tap elsewhere
          // (blur) clear the picked day.
          event.currentTarget.focus({
            preventScroll: true,
            focusVisible: false,
          })
          pick(event)
        }}
        // A mouse leaving ends a hover. A finger lifting fires leave too, but a
        // tapped day should stay put until focus moves elsewhere.
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setActive(null)
        }}
        onKeyDown={step}
        onBlur={() => setActive(null)}
      >
        <div className="relative h-36 sm:h-40">
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {[y(plan), 100].map((level) => (
              <line
                key={level}
                x1="0"
                x2="100"
                y1={level}
                y2={level}
                stroke="var(--line)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line
              x1="0"
              y1="100"
              x2="100"
              y2={y(plan)}
              stroke="var(--sea-ink-soft)"
              strokeOpacity="0.75"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            <path d={area} fill={color} fillOpacity="0.12" />
            <polyline
              points={points.join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={x(shown)}
              x2={x(shown)}
              y1="0"
              y2="100"
              stroke="var(--sea-ink-soft)"
              strokeOpacity={active === null ? 0 : 0.4}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span
            aria-hidden
            className="pointer-events-none absolute right-0 -translate-y-full pb-0.5 text-[0.75rem] font-semibold text-sea-ink-soft"
            style={{ top: `${y(plan)}%` }}
          >
            Plan {formatK(plan)}
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full shadow-[0_0_0_2px_var(--card-solid)]"
            style={{
              left: `${x(shown)}%`,
              top: `${y(cumulative[shown])}%`,
              backgroundColor: color,
            }}
          />
        </div>

        {/* Each day's spending, on the same day axis as the line. */}
        <div aria-hidden className="mt-2 flex h-10 items-end gap-px">
          {Array.from({ length: totalDays }, (_, day) => (
            <span key={day} className="flex h-full flex-1 items-end">
              {day <= today && daily[day] > 0 ? (
                <span
                  className={cn(
                    'block w-full rounded-t-[3px] bg-lagoon transition-opacity',
                    day === shown ? 'opacity-100' : 'opacity-40',
                  )}
                  style={{
                    height: `${Math.max(6, (daily[day] / barMax) * 100)}%`,
                  }}
                />
              ) : null}
            </span>
          ))}
        </div>
      </div>

      <p
        aria-hidden
        className="mt-1.5 flex justify-between text-[0.8rem] text-sea-ink-soft tabular-nums"
      >
        <span>{edgeFormat.format(new Date(startsAt))}</span>
        <span>
          Payday {edgeFormat.format(new Date(startsAt + totalDays * DAY_MS))}
        </span>
      </p>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8rem] text-sea-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-0.5 w-3.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          Spent
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="w-3.5 border-t-2 border-dashed border-sea-ink-soft"
          />
          Even pace
        </span>
        <span className="ml-auto">Tap or drag to see a day</span>
      </figcaption>
    </figure>
  )
}
