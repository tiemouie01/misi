import { actualSplit, splitOf } from '../../../shared/spending-split'

import type { SplitKey } from '../../../shared/spending-split'
import type { BudgetCycle } from './types'

const LABELS: Record<SplitKey, string> = {
  needs: 'Needs',
  wants: 'Wants',
  savings: 'Savings',
  other: 'Other',
}

/** Within this many points of the plan reads as "on plan". */
const ON_PLAN_POINTS = 3

function cue(actual: number, plan: number) {
  const gap = actual - plan
  if (Math.abs(gap) <= ON_PLAN_POINTS) return 'On plan'
  return gap > 0 ? 'More' : 'Less'
}

/**
 * How the cycle's used money split across needs, wants and savings, one row
 * each: the bar is the share so far and the tick is the share planned. Rows
 * are labelled in words, so colour carries nothing on its own.
 */
export function SpendingSplit({
  cycle,
  planned,
  formatMoney,
}: {
  cycle: BudgetCycle
  planned: { needs: number; wants: number; savings: number }
  formatMoney: (value: number) => string
}) {
  const plan = splitOf(planned)
  const actual = actualSplit({
    categories: cycle.categories,
    actualSpending:
      cycle.actualSpending ??
      cycle.categories.reduce((sum, category) => sum + category.spent, 0),
    actualSavings: cycle.actualSavings ?? 0,
  })
  const planPercent = (key: SplitKey) =>
    plan.parts.find((part) => part.key === key)?.percent

  if (actual.total <= 0) {
    return (
      <p className="px-1 text-sm text-sea-ink-soft">
        Nothing spent or saved yet this cycle.
      </p>
    )
  }

  return (
    <div className="grid gap-4 px-1">
      <ul className="grid gap-4">
        {actual.parts.map((part) => {
          const planShare = planPercent(part.key)
          return (
            <li key={part.key} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-bold text-sea-ink">
                  {LABELS[part.key]}{' '}
                  <span className="text-[0.8rem] font-semibold text-sea-ink-soft tabular-nums">
                    {formatMoney(part.amount)}
                  </span>
                </p>
                <p className="shrink-0 text-sm text-sea-ink-soft tabular-nums">
                  <span className="font-bold text-sea-ink">
                    {part.percent}%
                  </span>
                  {planShare === undefined ? null : (
                    <>
                      {' '}
                      · plan {planShare}% ·{' '}
                      <span className="font-semibold">
                        {cue(part.percent, planShare)}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div
                role="img"
                aria-label={`${LABELS[part.key]}: ${part.percent}% so far${
                  planShare === undefined ? '' : `, ${planShare}% planned`
                }`}
                className="relative h-2 rounded-full bg-(--line)"
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-lagoon transition-[width] duration-300"
                  style={{ width: `${part.percent}%` }}
                />
                {planShare === undefined ? null : (
                  <span
                    aria-hidden
                    className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-sea-ink"
                    style={{ left: `${planShare}%` }}
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-[0.8rem] text-sea-ink-soft">
        Shares of the {formatMoney(actual.total)}{' '}
        {cycle.isClosed ? 'you spent or saved' : 'you’ve spent or saved so far'}
        . The tick is your plan.
      </p>
    </div>
  )
}
