import { SplitBar } from '#/components/charts/split-bar'
import { actualSplit, splitOf } from '../../../shared/spending-split'

import type { SplitKey } from '../../../shared/spending-split'
import type { BudgetCycle } from './types'

const PARTS: Record<SplitKey, { label: string; color: string }> = {
  needs: { label: 'Needs', color: 'var(--lagoon-deep)' },
  wants: { label: 'Wants', color: 'var(--coral)' },
  savings: { label: 'Savings', color: 'var(--palm)' },
  other: {
    label: 'Other',
    color: 'color-mix(in oklab, var(--sea-ink-soft) 45%, transparent)',
  },
}

/**
 * The cycle's planned needs/wants/savings split beside what was actually
 * spent and saved, both as shares of 100 so drift shows at a glance.
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
    plan.parts.find((part) => part.key === key)?.percent ?? 0
  const toBar = (parts: typeof actual.parts) =>
    parts.map((part) => ({
      key: part.key,
      label: PARTS[part.key].label,
      percent: part.percent,
      color: PARTS[part.key].color,
      detail: `${part.percent}% (${formatMoney(part.amount)})`,
    }))

  return (
    <section
      aria-labelledby={`split-${cycle.id}`}
      className="space-y-3 border-t border-(--line) px-1 pt-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`split-${cycle.id}`} className="text-sm font-bold text-sea-ink">
          {cycle.isClosed ? 'How you split it' : 'How you’ve split it so far'}
        </h3>
        {actual.total > 0 ? (
          <p className="shrink-0 text-[0.8rem] text-sea-ink-soft tabular-nums">
            {formatMoney(actual.total)} used
          </p>
        ) : null}
      </div>

      {actual.total > 0 ? (
        <>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
            <span className="text-[0.8rem] font-semibold text-sea-ink-soft">
              Plan
            </span>
            <SplitBar label="Planned split" parts={toBar(plan.parts)} />
            <span className="text-[0.8rem] font-semibold text-sea-ink-soft">
              Actual
            </span>
            <SplitBar label="Actual split" parts={toBar(actual.parts)} />
          </div>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(4.5rem,1fr))] gap-x-3 gap-y-2">
            {actual.parts.map((part) => (
              <li key={part.key} className="min-w-0">
                <p className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-sea-ink-soft">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: PARTS[part.key].color }}
                    aria-hidden="true"
                  />
                  {PARTS[part.key].label}
                </p>
                <p className="font-bold text-sea-ink">
                  {part.percent}%{' '}
                  {part.key === 'other' ? null : (
                    <span className="text-[0.75rem] font-semibold text-sea-ink-soft">
                      plan {planPercent(part.key)}%
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-[0.75rem] text-sea-ink-soft">
            Shares of what you planned and what you’ve used, so they leave out
            money that’s not planned yet.
          </p>
        </>
      ) : (
        <p className="text-[0.8rem] text-sea-ink-soft">
          Nothing spent or saved yet this cycle.
        </p>
      )}
    </section>
  )
}
