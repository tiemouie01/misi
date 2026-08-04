import { Tag } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Progress } from '#/components/ui/progress'
import { formatK } from '#/lib/app-data'
import { resolveCategory } from '#/lib/categories'

import type { BudgetCategory } from '#/lib/app-data'
import type { Category } from '#/lib/categories'

interface BudgetCardProps {
  budgets: BudgetCategory[]
  categories: Category[]
  budget: number
  dayNumber: number
  totalDays: number
  dayOf: string
  endsOn: string
  totalSpent: number
  spendingLeft: number
  perDay: number
  animationDelay: string
}

export function BudgetCard({
  budgets,
  categories,
  budget,
  dayNumber,
  totalDays,
  dayOf,
  endsOn,
  totalSpent,
  spendingLeft,
  perDay,
  animationDelay,
}: BudgetCardProps) {
  const spentPct = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0
  const pacePct = totalDays > 0 ? Math.round((dayNumber / totalDays) * 100) : 0

  return (
    <Card
      variant="island"
      className="rise-in gap-0 rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="island-kicker">Spending wallet</p>
        <span className="font-mono text-[0.72rem] font-semibold text-sea-ink-soft">
          {dayOf}
        </span>
      </div>
      <p className="font-display mt-1.5 text-3xl font-bold tracking-tight text-sea-ink tabular-nums">
        {formatK(spendingLeft)} left
      </p>
      <p className="mt-1 text-sm text-sea-ink-soft">
        of <span className="font-mono tabular-nums">{formatK(budget)}</span> ·{' '}
        <span className="font-mono tabular-nums">{formatK(perDay)}</span>/day
        until {endsOn}
      </p>
      <div className="mt-4">
        <div className="relative">
          <Progress
            value={spentPct}
            aria-label="Cycle budget spent"
            aria-valuetext={`${spentPct}% spent`}
            className="h-2.5 [&_[data-slot=progress-indicator]]:from-lagoon-deep"
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
        {budgets.map((categoryBudget) => {
          const category = resolveCategory(
            categories,
            categoryBudget.categoryId,
          )
          const Icon = category?.icon ?? Tag
          const color = category?.color ?? 'var(--lagoon-deep)'
          const name = category?.name ?? categoryBudget.categoryId
          return (
            <div key={categoryBudget.categoryId}>
              <div className="flex items-center gap-2">
                <Icon className="size-4 shrink-0" style={{ color }} />
                <span className="w-28 shrink-0 text-sm font-semibold text-sea-ink">
                  {name}
                </span>
                <div
                  role="progressbar"
                  aria-label={`${name} budget spent`}
                  aria-valuemin={0}
                  aria-valuemax={categoryBudget.budget}
                  aria-valuenow={Math.min(
                    categoryBudget.spent,
                    categoryBudget.budget,
                  )}
                  aria-valuetext={`${formatK(categoryBudget.spent)} of ${formatK(categoryBudget.budget)} spent`}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--line)"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min((categoryBudget.spent / categoryBudget.budget) * 100, 100)}%`,
                      background: color,
                    }}
                  />
                </div>
                <span className="font-mono w-28 shrink-0 text-right text-[0.72rem] whitespace-nowrap text-sea-ink-soft tabular-nums">
                  {formatK(categoryBudget.spent)}/
                  {categoryBudget.budget.toLocaleString('en-US')}
                </span>
              </div>
              {categoryBudget.categoryId === 'eating-out' && (
                <p className="mt-0.5 text-right text-[0.72rem] font-semibold text-coral-deep">
                  runs out ~6 Aug
                </p>
              )}
            </div>
          )
        })}
      </div>
      <Button type="button" variant="secondary" className="mt-4 self-start">
        Adjust budgets
      </Button>
    </Card>
  )
}
