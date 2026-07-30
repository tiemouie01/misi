import { useState } from 'react'

import {
  CYCLE_BUDGET,
  CYCLE_DAY,
  CYCLE_DAYS,
  categories,
  formatK,
} from '#/lib/app-data'

import type { BudgetCategory } from '#/lib/app-data'

interface BudgetCardProps {
  budgets: BudgetCategory[]
  totalSpent: number
  spendingLeft: number
  perDay: number
  animationDelay: string
}

export function BudgetCard({
  budgets,
  totalSpent,
  spendingLeft,
  perDay,
  animationDelay,
}: BudgetCardProps) {
  const [showNote, setShowNote] = useState(false)
  const spentPct = Math.round((totalSpent / CYCLE_BUDGET) * 100)
  const pacePct = Math.round((CYCLE_DAY / CYCLE_DAYS) * 100)

  return (
    <section
      className="island-shell rise-in rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="island-kicker">Spending wallet</p>
        <span className="font-mono text-[0.72rem] font-semibold text-sea-ink-soft">
          day 11 of 31
        </span>
      </div>
      <p className="font-display mt-1.5 text-3xl font-bold tracking-tight text-sea-ink tabular-nums">
        {formatK(spendingLeft)} left
      </p>
      <p className="mt-1 text-sm text-sea-ink-soft">
        of <span className="font-mono tabular-nums">K650,000</span> ·{' '}
        <span className="font-mono tabular-nums">{formatK(perDay)}</span>/day
        until 19 Aug
      </p>
      <div className="mt-4">
        <div className="relative h-2.5 rounded-full bg-(--line)">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-lagoon-deep to-palm"
            style={{ width: `${spentPct}%` }}
          />
          <span
            className="absolute -inset-y-0.5 w-0.5 rounded bg-sea-ink/50"
            style={{ left: `${pacePct}%` }}
          />
        </div>
        <p className="mt-2 text-[0.75rem] text-sea-ink-soft">
          {spentPct}% spent · pace mark {pacePct}% — slightly ahead, watch
          Eating out.
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {budgets.map((budget) => {
          const category = categories.find(
            (item) => item.id === budget.categoryId,
          )
          if (!category) return null
          const Icon = category.icon
          return (
            <div key={budget.categoryId}>
              <div className="flex items-center gap-2">
                <Icon
                  className="size-4 shrink-0"
                  style={{ color: category.color }}
                />
                <span className="w-28 shrink-0 text-sm font-semibold text-sea-ink">
                  {category.name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--line)">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min((budget.spent / budget.budget) * 100, 100)}%`,
                      background: category.color,
                    }}
                  />
                </div>
                <span className="font-mono w-28 shrink-0 text-right text-[0.72rem] whitespace-nowrap text-sea-ink-soft tabular-nums">
                  {formatK(budget.spent)}/{budget.budget.toLocaleString('en-US')}
                </span>
              </div>
              {budget.categoryId === 'eating-out' && (
                <p className="mt-0.5 text-right text-[0.72rem] font-semibold text-[#c05a40]">
                  runs out ~6 Aug
                </p>
              )}
            </div>
          )
        })}
      </div>
      <button
        type="button"
        className="mt-4 rounded-full border border-(--chip-line) bg-(--chip-bg) px-5 py-2.5 text-sm font-bold text-sea-ink transition hover:border-lagoon-deep"
        onClick={() => setShowNote(true)}
      >
        Adjust budgets
      </button>
      {showNote && (
        <p className="mt-2 text-[0.78rem] text-sea-ink-soft italic">
          Budget editing arrives with the backend — this prototype uses sample
          data.
        </p>
      )}
    </section>
  )
}
