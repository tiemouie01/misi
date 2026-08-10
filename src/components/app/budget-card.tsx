import { Tag } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Progress } from '#/components/ui/progress'
import { formatK } from '#/lib/app-data'
import { resolveCategory } from '#/lib/categories'

import type { BudgetCategory } from '#/lib/app-data'
import type { Category } from '#/lib/categories'

const DAY_MS = 86_400_000

interface BudgetCardProps {
  budgets: BudgetCategory[]
  categories: Category[]
  spendingLimit: number
  dayNumber: number
  totalDays: number
  daysRemaining: number
  dayOf: string
  endsOn: string
  cycleStartsAt: number
  now: number
  totalSpent: number
  spendingLeft: number
  perDay: number
  animationDelay: string
  onAdjustBudgets?: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function shortDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp))
}

function categoryForecast({
  budget,
  spent,
  dayNumber,
  totalDays,
  cycleStartsAt,
  now,
}: {
  budget: number
  spent: number
  dayNumber: number
  totalDays: number
  cycleStartsAt: number
  now: number
}) {
  if (budget <= 0) {
    return spent > 0
      ? { label: 'Unplanned spend', tone: 'alert' as const }
      : { label: 'No budget set', tone: 'muted' as const }
  }

  if (spent > budget) {
    return {
      label: `${formatK(spent - budget)} over budget`,
      tone: 'alert' as const,
    }
  }

  if (spent <= 0 || dayNumber <= 0 || totalDays <= 0) {
    return {
      label: `${formatK(budget)} available`,
      tone: 'muted' as const,
    }
  }

  const dailyRate = spent / dayNumber
  const projected = dailyRate * totalDays
  if (projected > budget && dailyRate > 0) {
    const daysUntilLimit = budget / dailyRate
    const runOutAt = cycleStartsAt + Math.ceil(daysUntilLimit) * DAY_MS
    if (Number.isFinite(runOutAt) && runOutAt > now) {
      return {
        label: `Forecast to reach limit ${shortDate(runOutAt)}`,
        tone: 'alert' as const,
      }
    }
    return { label: 'Forecast over budget', tone: 'alert' as const }
  }

  return {
    label: `Forecast ${formatK(Math.round(projected))}`,
    tone: 'muted' as const,
  }
}

export function BudgetCard({
  budgets,
  categories,
  spendingLimit,
  dayNumber,
  totalDays,
  daysRemaining,
  dayOf,
  endsOn,
  cycleStartsAt,
  now,
  totalSpent,
  spendingLeft,
  perDay,
  animationDelay,
  onAdjustBudgets,
}: BudgetCardProps) {
  const safeLimit = Math.max(0, spendingLimit)
  const safeTotalDays = Math.max(1, totalDays)
  const safeDayNumber = clamp(dayNumber, 0, safeTotalDays)
  const spentPct =
    safeLimit > 0 ? Math.round((Math.max(0, totalSpent) / safeLimit) * 100) : 0
  const pacePct = Math.round((safeDayNumber / safeTotalDays) * 100)
  const paceStatus =
    safeLimit <= 0
      ? 'No spending limit set'
      : totalSpent <= 0
        ? 'No spending yet'
        : spentPct > pacePct + 5
          ? 'Spending faster than plan'
          : spentPct < pacePct - 5
            ? 'Spending slower than plan'
            : 'On pace'

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
        of <span className="font-mono tabular-nums">{formatK(safeLimit)}</span>{' '}
        · <span className="font-mono tabular-nums">{formatK(perDay)}</span>/day
        until {endsOn} · {daysRemaining} day
        {daysRemaining === 1 ? '' : 's'} remaining
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
          {spentPct}% spent · pace mark {pacePct}% — {paceStatus}.
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
          const plannedAmount = Math.max(0, categoryBudget.plannedAmount)
          const categorySpentPct =
            plannedAmount > 0
              ? Math.round(
                  (Math.max(0, categoryBudget.spent) / plannedAmount) * 100,
                )
              : 0
          const forecast = categoryForecast({
            budget: plannedAmount,
            spent: categoryBudget.spent,
            dayNumber: safeDayNumber,
            totalDays: safeTotalDays,
            cycleStartsAt,
            now,
          })
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
                  aria-valuemax={plannedAmount}
                  aria-valuenow={Math.min(
                    Math.max(0, categoryBudget.spent),
                    plannedAmount,
                  )}
                  aria-valuetext={`${formatK(categoryBudget.spent)} of ${formatK(plannedAmount)} spent`}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--line)"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(categorySpentPct, 100)}%`,
                      background: color,
                    }}
                  />
                </div>
                <span className="font-mono w-28 shrink-0 text-right text-[0.72rem] whitespace-nowrap text-sea-ink-soft tabular-nums">
                  {formatK(categoryBudget.spent)}/
                  {plannedAmount.toLocaleString('en-US')}
                </span>
              </div>
              <p
                className={`mt-0.5 text-right text-[0.72rem] font-semibold ${
                  forecast.tone === 'alert'
                    ? 'text-coral-deep'
                    : 'text-sea-ink-soft'
                }`}
              >
                {forecast.label}
              </p>
            </div>
          )
        })}
      </div>
      <Button
        type="button"
        variant="secondary"
        className="mt-4 self-start"
        onClick={onAdjustBudgets}
      >
        Adjust budgets
      </Button>
    </Card>
  )
}
