import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
  Pencil,
  ReceiptText,
  Target,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { useState } from 'react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Progress } from '#/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { cn } from '#/lib/utils'
import {
  hasPreviousSpend,
  seedCycleBudgetsFromPrevious,
  spendingLimitForPlans,
} from '../../../shared/budget-rollover'
import { incomeSourceStatus } from '../../../shared/income'

import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import type {
  BudgetCategoryPlan,
  BudgetCategoryStatus,
  BudgetCycle,
  BudgetGroup,
  BudgetHistoryRow,
  BudgetIncomeSourcePlan,
  BudgetPageProps,
  BudgetPlanUpdate,
  BudgetTab,
} from './types'

interface BudgetDraft {
  spendingLimit: string
  categoryPlans: Record<string, string>
}

interface CategoryInsight {
  remaining: number
  spentPercent: number
  incomePercent: number
  status: BudgetCategoryStatus
  statusLabel: string
  forecast: string
  projected: number | null
}

const GROUPS: readonly BudgetGroup[] = ['needs', 'wants']

const GROUP_META: Record<BudgetGroup, { label: string; color: string }> = {
  needs: { label: 'Needs', color: 'var(--lagoon-deep)' },
  wants: { label: 'Wants', color: 'var(--coral)' },
}

/** Lagoon fill for Progress on cards and on the ground, like home. */
const LAGOON_PROGRESS =
  '[&_[data-slot=progress-indicator]]:bg-none [&_[data-slot=progress-indicator]]:bg-lagoon'

const wholeNumberFormat = new Intl.NumberFormat('en-US')

export function formatBudgetMoney(value: number, currency = 'K') {
  const amount = Number.isFinite(value) ? value : 0
  const sign = amount < 0 ? '−' : ''
  return `${sign}${currency}${wholeNumberFormat.format(Math.round(Math.abs(amount)))}`
}

export function formatBudgetPercent(value: number, digits = 0) {
  if (!Number.isFinite(value)) return '0%'
  return `${value.toFixed(digits)}%`
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))
}

function positiveAmount(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0
}

function groupTotal(
  categories: readonly BudgetCategoryPlan[],
  group: BudgetGroup,
) {
  return categories.reduce(
    (total, category) =>
      category.group === group
        ? total + positiveAmount(category.planned)
        : total,
    0,
  )
}

function plannedSavingsTotal(
  incomeSources: readonly BudgetIncomeSourcePlan[] | undefined,
) {
  return (incomeSources ?? []).reduce(
    (total, source) =>
      total +
      positiveAmount(source.expectedAmount) * Math.max(0, source.savingsRate),
    0,
  )
}

function hasPreviousCycle(cycle: BudgetCycle) {
  return cycle.previousActualSpending !== undefined
}

function canApplyPreviousSpend(cycle: BudgetCycle) {
  return hasPreviousSpend({
    previousActualSpending: cycle.previousActualSpending,
    categorySpent: cycle.categories.map((category) =>
      positiveAmount(category.previousSpent),
    ),
  })
}

function applyPreviousSpend(
  cycle: BudgetCycle,
  draft: BudgetDraft,
): BudgetDraft {
  const seeded = seedCycleBudgetsFromPrevious({
    categories: cycle.categories.map((category) => ({
      categoryId: category.id,
      spent: positiveAmount(category.previousSpent),
      planned: parseAmount(draft.categoryPlans[category.id] ?? ''),
    })),
    previousActualSpending: positiveAmount(cycle.previousActualSpending),
    previousSpendingLimit: parseAmount(draft.spendingLimit),
  })

  return {
    ...draft,
    spendingLimit: String(seeded.spendingLimit),
    categoryPlans: Object.fromEntries(
      seeded.categoryPlans.map((plan) => [
        plan.categoryId,
        String(plan.plannedAmount),
      ]),
    ),
  }
}

function createDraft(cycle: BudgetCycle): BudgetDraft {
  const categoryPlans = Object.fromEntries(
    cycle.categories.map((category) => [
      category.id,
      String(Math.max(0, Math.round(category.planned))),
    ]),
  )
  return {
    spendingLimit: String(
      spendingLimitForPlans(
        cycle.spendingLimit,
        cycle.categories.map((category) => category.planned),
      ),
    ),
    categoryPlans,
  }
}

function parseAmount(value: string) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : 0
}

function getCategoryInsight(
  category: BudgetCategoryPlan,
  cycle: BudgetCycle,
  expectedIncome: number,
): CategoryInsight {
  const planned = positiveAmount(category.planned)
  const spent = positiveAmount(category.spent)
  const remaining = planned - spent
  const spentPercent =
    planned > 0 ? (spent / planned) * 100 : spent > 0 ? 100 : 0
  const incomePercent =
    expectedIncome > 0 ? (planned / expectedIncome) * 100 : 0
  const elapsed = positiveAmount(cycle.daysElapsed)
  const totalDays = positiveAmount(cycle.totalDays)
  const hasPace = elapsed > 0 && totalDays > 0
  const projected = hasPace ? (spent / elapsed) * totalDays : null

  if (planned === 0 && spent > 0) {
    return {
      remaining,
      spentPercent,
      incomePercent,
      status: 'over-budget',
      statusLabel: 'Over budget',
      forecast: `Over by ${formatBudgetMoney(spent)}`,
      projected,
    }
  }

  if (planned === 0) {
    return {
      remaining,
      spentPercent,
      incomePercent,
      status: 'not-started',
      statusLabel: 'Not started',
      forecast: 'No plan set for this category',
      projected,
    }
  }

  if (spent > planned) {
    return {
      remaining,
      spentPercent,
      incomePercent,
      status: 'over-budget',
      statusLabel: 'Over budget',
      forecast: `Over by ${formatBudgetMoney(spent - planned)}`,
      projected,
    }
  }

  const isWatch =
    spentPercent >= 85 || (projected !== null && projected > planned * 1.1)

  if (isWatch) {
    const dailySpend = elapsed > 0 ? spent / elapsed : 0
    const daysUntilLimit =
      dailySpend > 0 && remaining > 0 ? Math.ceil(remaining / dailySpend) : 0

    return {
      remaining,
      spentPercent,
      incomePercent,
      status: 'watch',
      statusLabel: 'Watch',
      forecast:
        daysUntilLimit > 0
          ? `Likely runs out in ~${daysUntilLimit} day${daysUntilLimit === 1 ? '' : 's'}`
          : 'Spending is moving faster than plan',
      projected,
    }
  }

  if (spent === 0) {
    return {
      remaining,
      spentPercent,
      incomePercent,
      status: 'not-started',
      statusLabel: 'Not started',
      forecast: hasPace ? 'Ready when you need it' : 'No spending yet',
      projected,
    }
  }

  const projectedRemainder = projected !== null ? planned - projected : null
  return {
    remaining,
    spentPercent,
    incomePercent,
    status: 'on-track',
    statusLabel: 'On track',
    forecast:
      projectedRemainder !== null && projectedRemainder > 0
        ? `On pace to finish with ${formatBudgetMoney(projectedRemainder)} left`
        : 'On track for this cycle',
    projected,
  }
}

function statusBadgeVariant(status: BudgetCategoryStatus) {
  if (status === 'on-track') return 'success' as const
  if (status === 'over-budget') return 'destructive' as const
  if (status === 'watch') return 'default' as const
  return 'secondary' as const
}

/** The page's main number, straight on the teal ground like home's hero. */
function BudgetHero({
  cycle,
  totalSpent,
  currency,
}: {
  cycle: BudgetCycle
  totalSpent: number
  currency: string
}) {
  const spendingLimit = positiveAmount(cycle.spendingLimit)
  const remaining = spendingLimit - totalSpent
  const over = remaining < 0
  const spentPercent =
    spendingLimit > 0 ? (totalSpent / spendingLimit) * 100 : 0
  const dayLabel =
    cycle.daysElapsed !== undefined && cycle.totalDays !== undefined
      ? `Day ${Math.max(0, Math.round(cycle.daysElapsed))} of ${Math.max(0, Math.round(cycle.totalDays))}`
      : (cycle.rangeLabel ?? 'Payday cycle')

  return (
    <section className="flex flex-col gap-3 py-1">
      <h2 className="text-[0.95rem] font-semibold text-sea-ink-soft">
        {over ? 'Over your spending limit by' : 'Left to spend this cycle'}
      </h2>
      <p className="text-[2.75rem] leading-none font-extrabold tracking-tight tabular-nums sm:text-6xl">
        {formatBudgetMoney(Math.abs(remaining), currency)}
      </p>
      {/* Water that drains as money is spent; empty, on a coral track, once
          over the limit. */}
      <Progress
        variant="water"
        value={Math.max(0, remaining)}
        max={Math.max(spendingLimit, 1)}
        aria-label="Money left of the spending limit"
        aria-valuetext={`${formatBudgetPercent(Math.max(0, 100 - spentPercent))} of the spending limit left`}
        className={cn(
          'bg-white/16 dark:bg-lagoon-deep/12',
          over && 'bg-coral/30 dark:bg-coral/30',
        )}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-sm text-sea-ink-soft tabular-nums">
          {formatBudgetMoney(totalSpent, currency)} spent (
          {formatBudgetPercent(spentPercent)}) · Limit:{' '}
          {formatBudgetMoney(spendingLimit, currency)}
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[0.8rem] font-bold text-sea-ink dark:bg-lagoon-deep/12">
          <CalendarDays className="size-3.5 text-lagoon" aria-hidden="true" />
          {dayLabel}
        </span>
      </div>
    </section>
  )
}

function StatTile({
  label,
  value,
  detail,
  warn,
  className,
}: {
  label: string
  value: string
  detail: string
  warn?: boolean
  className?: string
}) {
  return (
    <Card
      variant="panel"
      className={cn('min-w-0 gap-1.5 p-4 sm:gap-2 sm:p-5', className)}
    >
      <h2 className="text-sm font-semibold text-sea-ink-soft sm:text-[0.95rem]">
        {label}
      </h2>
      <p
        className={cn(
          'text-2xl leading-tight font-extrabold wrap-anywhere tabular-nums sm:text-[2rem]',
          warn && 'text-coral-deep',
        )}
      >
        {value}
      </p>
      <p className="text-[0.8rem] text-sea-ink-soft sm:text-sm">{detail}</p>
    </Card>
  )
}

function CardHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-1">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-sea-ink">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-sea-ink-soft">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

function AllocationCard({
  cycle,
  currency,
}: {
  cycle: BudgetCycle
  currency: string
}) {
  const expectedIncome = positiveAmount(cycle.expectedIncome)
  const needs = groupTotal(cycle.categories, 'needs')
  const wants = groupTotal(cycle.categories, 'wants')
  const savings = plannedSavingsTotal(cycle.incomeSources)
  const spendingLimit = positiveAmount(cycle.spendingLimit)
  const allocated = needs + wants + savings
  const unallocated = expectedIncome - allocated
  const segments = [
    {
      key: 'needs',
      label: 'Needs',
      amount: needs,
      color: 'var(--lagoon-deep)',
    },
    { key: 'wants', label: 'Wants', amount: wants, color: 'var(--coral)' },
    { key: 'savings', label: 'Savings', amount: savings, color: 'var(--palm)' },
    {
      key: 'unallocated',
      label: unallocated < 0 ? 'Planned too much' : 'Not planned yet',
      amount: Math.abs(unallocated),
      color: unallocated < 0 ? 'var(--coral-deep)' : 'var(--sun)',
    },
  ]

  return (
    <Card variant="panel" className="min-w-0 gap-4 p-4 sm:p-5">
      <CardHeading
        title="Where your income goes"
        action={
          <p
            className={cn(
              'shrink-0 pt-1 text-sm font-bold tabular-nums',
              unallocated < 0 ? 'text-coral-deep' : 'text-sea-ink-soft',
            )}
          >
            {unallocated < 0
              ? `${formatBudgetMoney(Math.abs(unallocated), currency)} over`
              : `${formatBudgetMoney(unallocated, currency)} free`}
          </p>
        }
      />

      <div
        className="mx-1 flex h-3 overflow-hidden rounded-full bg-(--line)"
        role="img"
        aria-label={`Income allocation: ${segments
          .map(
            (segment) =>
              `${segment.label} ${formatBudgetMoney(segment.amount, currency)}`,
          )
          .join(', ')}`}
      >
        {expectedIncome > 0
          ? segments.map((segment) => {
              const width = clampPercent(
                (segment.amount / expectedIncome) * 100,
              )
              if (width === 0) return null
              return (
                <span
                  key={segment.key}
                  className="h-full min-w-1 transition-[width] duration-300"
                  style={{ width: `${width}%`, backgroundColor: segment.color }}
                  title={`${segment.label}: ${formatBudgetMoney(segment.amount, currency)}`}
                />
              )
            })
          : null}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
        {segments.map((segment) => {
          const percent =
            expectedIncome > 0 ? (segment.amount / expectedIncome) * 100 : 0
          return (
            <div key={segment.key} className="flex min-w-0 items-start gap-2.5">
              <span
                className="mt-1.5 size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="truncate text-[0.8rem] font-semibold text-sea-ink-soft">
                  {segment.label}
                </p>
                <p className="font-bold text-sea-ink tabular-nums">
                  {formatBudgetMoney(segment.amount, currency)}{' '}
                  <span className="text-[0.8rem] font-semibold text-sea-ink-soft">
                    {formatBudgetPercent(percent)}
                  </span>
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {expectedIncome === 0 ? (
        <p className="rounded-2xl bg-sun/12 px-3.5 py-3 text-sm font-semibold text-sea-ink-soft">
          Add how much income you expect to see where it goes.
        </p>
      ) : spendingLimit !== needs + wants ? (
        <p className="px-1 text-[0.8rem] text-sea-ink-soft">
          Your needs and wants add up to{' '}
          {formatBudgetMoney(needs + wants, currency)} of the{' '}
          {formatBudgetMoney(spendingLimit, currency)} spending limit.
        </p>
      ) : null}
    </Card>
  )
}

function CategoryRow({
  category,
  insight,
  currency,
}: {
  category: BudgetCategoryPlan
  insight: CategoryInsight
  currency: string
}) {
  const Icon = category.icon ?? ReceiptText
  const color = category.color ?? GROUP_META[category.group].color
  const progressValue = clampPercent(insight.spentPercent)
  const statusIndicator =
    insight.status === 'on-track' ? (
      <CircleCheck aria-hidden="true" />
    ) : insight.status === 'not-started' ? (
      <Target aria-hidden="true" />
    ) : (
      <CircleAlert aria-hidden="true" />
    )

  return (
    <li className="flex items-start gap-3 px-1 py-3">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-xl"
        style={{
          color,
          background: `color-mix(in oklab, ${color} 14%, transparent)`,
        }}
        aria-hidden="true"
      >
        <Icon className="size-[1.125rem]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="truncate font-semibold text-sea-ink">
            {category.name}
          </h4>
          <Badge
            variant={statusBadgeVariant(insight.status)}
            className={cn(
              'shrink-0',
              insight.status === 'watch' && 'border-sun/35 bg-sun/12 text-sun',
            )}
            aria-label={`${insight.statusLabel}. ${insight.forecast}`}
          >
            {statusIndicator}
            {insight.statusLabel}
          </Badge>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-(--line)"
          role="progressbar"
          aria-label={`${category.name} spent`}
          aria-valuemin={0}
          aria-valuemax={Math.max(0, category.planned)}
          aria-valuenow={Math.min(
            positiveAmount(category.spent),
            positiveAmount(category.planned),
          )}
          aria-valuetext={`${formatBudgetMoney(category.spent, currency)} of ${formatBudgetMoney(category.planned, currency)} spent`}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${progressValue}%`,
              backgroundColor:
                insight.status === 'over-budget'
                  ? 'var(--coral-deep)'
                  : insight.status === 'watch'
                    ? 'var(--sun)'
                    : color,
            }}
          />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3 text-[0.8rem] text-sea-ink-soft tabular-nums sm:text-sm">
          <span>
            {formatBudgetMoney(category.spent, currency)} of{' '}
            {formatBudgetMoney(category.planned, currency)}
            <span className="max-sm:hidden">
              {' '}
              · {formatBudgetPercent(insight.incomePercent)} of income
            </span>
          </span>
          <span
            className={cn(
              'text-right font-bold',
              insight.remaining < 0 ? 'text-coral-deep' : 'text-sea-ink',
            )}
          >
            {formatBudgetMoney(Math.abs(insight.remaining), currency)}{' '}
            {insight.remaining < 0 ? 'over' : 'left'}
          </span>
        </div>
        <p className="mt-1.5 hidden items-center gap-1.5 text-[0.8rem] text-sea-ink-soft sm:flex">
          {insight.status === 'over-budget' ? (
            <ArrowUpRight
              className="size-3.5 text-coral-deep"
              aria-hidden="true"
            />
          ) : insight.status === 'watch' ? (
            <CircleAlert className="size-3.5 text-sun" aria-hidden="true" />
          ) : (
            <TrendingUp className="size-3.5 text-palm" aria-hidden="true" />
          )}
          {insight.forecast}
        </p>
      </div>
    </li>
  )
}

function CategoryPlanCard({
  cycle,
  currency,
}: {
  cycle: BudgetCycle
  currency: string
}) {
  const expectedIncome = positiveAmount(cycle.expectedIncome)
  const grouped = GROUPS.map((group) => ({
    group,
    categories: cycle.categories.filter((category) => category.group === group),
  }))

  return (
    <Card variant="panel" className="min-w-0 gap-4 p-4 sm:p-5">
      <CardHeading
        title="Needs and wants"
        description={`${formatBudgetMoney(cycle.spendingLimit, currency)} to spend on your plan`}
      />
      {grouped.map(({ group, categories }) => (
        <section key={group} aria-labelledby={`budget-group-${group}`}>
          <div className="flex items-center justify-between gap-3 px-1">
            <h3
              id={`budget-group-${group}`}
              className="flex items-center gap-2 text-sm font-bold text-sea-ink-soft"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: GROUP_META[group].color }}
                aria-hidden="true"
              />
              {GROUP_META[group].label}
            </h3>
            <span className="text-sm font-semibold text-sea-ink-soft tabular-nums">
              {formatBudgetMoney(groupTotal(cycle.categories, group), currency)}
            </span>
          </div>
          {categories.length > 0 ? (
            <ul className="divide-y divide-(--line)">
              {categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  insight={getCategoryInsight(category, cycle, expectedIncome)}
                  currency={currency}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-2 rounded-2xl bg-lagoon-deep/6 px-4 py-4 text-sm text-sea-ink-soft">
              No {GROUP_META[group].label.toLowerCase()} planned yet.
            </p>
          )}
        </section>
      ))}
    </Card>
  )
}

function getIncomeSourceStatus(source: BudgetIncomeSourcePlan) {
  const planned = positiveAmount(source.expectedAmount)
  const actual = positiveAmount(source.actualAmount)
  const status = incomeSourceStatus(actual, planned)
  if (status === 'landed') return 'Arrived'
  if (status === 'partial') return 'Part arrived'
  return 'Waiting'
}

function IncomeSourcesCard({
  cycle,
  currency,
  onManage,
}: {
  cycle: BudgetCycle
  currency: string
  onManage?: () => void
}) {
  const sources = cycle.incomeSources ?? []
  const planned = sources.reduce(
    (total, source) => total + positiveAmount(source.expectedAmount),
    0,
  )
  const actual = sources.reduce(
    (total, source) => total + positiveAmount(source.actualAmount),
    0,
  )
  const totalActual = positiveAmount(cycle.actualIncome)
  const unassigned = Math.max(
    0,
    positiveAmount(cycle.unassignedIncome ?? totalActual - actual),
  )
  const actualTotal = Math.max(totalActual, actual + unassigned)
  const actualPercent =
    planned > 0 ? clampPercent((actualTotal / planned) * 100) : 0
  const unassignedNotice =
    unassigned > 0 ? (
      <div className="rounded-2xl bg-sun/12 px-3.5 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-sea-ink">
            Income without a source
          </span>
          <span className="font-bold text-sea-ink tabular-nums">
            {formatBudgetMoney(unassigned, currency)}
          </span>
        </div>
        <p className="mt-1 text-[0.8rem] text-sea-ink-soft">
          Counted in the total, but not linked to one of your paydays.
        </p>
      </div>
    ) : null

  return (
    <Card variant="panel" className="min-w-0 gap-4 p-4 sm:p-5">
      <CardHeading
        title="Money coming in"
        description="Each payday you expect, and what has arrived."
        action={
          onManage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mr-1 h-9 shrink-0 px-2.5 text-lagoon-deep"
              onClick={onManage}
            >
              Manage
            </Button>
          ) : null
        }
      />
      {sources.length > 0 ? (
        <>
          <div className="rounded-2xl bg-lagoon-deep/6 p-4">
            <div className="flex items-center justify-between gap-3 text-sm text-sea-ink-soft tabular-nums">
              <span>
                <span className="font-bold text-sea-ink">
                  {formatBudgetMoney(actualTotal, currency)}
                </span>{' '}
                arrived
              </span>
              <span>{formatBudgetMoney(planned, currency)} expected</span>
            </div>
            <Progress
              value={actualPercent}
              aria-label="Income arrived against plan"
              aria-valuetext={`${formatBudgetPercent(actualPercent)} of expected income arrived`}
              className={cn('mt-2.5 h-2', LAGOON_PROGRESS)}
            />
          </div>
          <ul className="-mt-1 divide-y divide-(--line)">
            {sources.map((source) => {
              const Icon = source.icon ?? Banknote
              const sourcePlan = positiveAmount(source.expectedAmount)
              const sourceActual = positiveAmount(source.actualAmount)
              const sourceProgress =
                sourcePlan > 0
                  ? clampPercent((sourceActual / sourcePlan) * 100)
                  : 0
              const status = getIncomeSourceStatus(source)
              return (
                <li
                  key={source.id}
                  className="flex items-start gap-3 px-1 py-3"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-palm/12 text-palm"
                    aria-hidden="true"
                  >
                    <Icon className="size-[1.125rem]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-sea-ink">
                        {source.name}
                      </p>
                      <Badge
                        variant={
                          status === 'Arrived'
                            ? 'success'
                            : status === 'Part arrived'
                              ? 'default'
                              : 'secondary'
                        }
                        className="shrink-0"
                      >
                        {status === 'Arrived' ? (
                          <Check aria-hidden="true" />
                        ) : null}
                        {status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[0.8rem] text-sea-ink-soft tabular-nums sm:text-sm">
                      {formatBudgetMoney(sourceActual, currency)} of{' '}
                      {formatBudgetMoney(sourcePlan, currency)}
                    </p>
                    <Progress
                      value={sourceProgress}
                      aria-label={`${source.name} arrived against plan`}
                      aria-valuetext={`${formatBudgetMoney(sourceActual, currency)} of ${formatBudgetMoney(sourcePlan, currency)} arrived`}
                      className={cn('mt-2 h-1.5', LAGOON_PROGRESS)}
                    />
                    {source.note ? (
                      <p className="mt-1.5 text-[0.8rem] text-sea-ink-soft">
                        {source.note}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          {unassignedNotice}
        </>
      ) : (
        <>
          {unassignedNotice}
          <p className="rounded-2xl bg-lagoon-deep/6 px-4 py-5 text-sm text-sea-ink-soft">
            No income sources have been added to this cycle yet.
          </p>
        </>
      )}
    </Card>
  )
}

function HistoryCard({
  rows,
  currency,
}: {
  rows: readonly BudgetHistoryRow[]
  currency: string
}) {
  return (
    <Card variant="panel" className="min-w-0 gap-4 p-4 sm:p-5">
      <CardHeading
        title="Past cycles"
        description="What happened in each finished payday cycle."
      />
      {rows.length > 0 ? (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-1.5 text-left">
            <caption className="sr-only">
              Budget results for each payday cycle
            </caption>
            <thead>
              <tr className="text-[0.8rem] font-semibold text-sea-ink-soft">
                <th className="px-3 py-1.5 font-semibold">Cycle</th>
                <th className="px-3 py-1.5 text-right font-semibold">Income</th>
                <th className="px-3 py-1.5 text-right font-semibold">Needs</th>
                <th className="px-3 py-1.5 text-right font-semibold">Wants</th>
                <th className="px-3 py-1.5 text-right font-semibold">
                  Savings
                </th>
                <th className="px-3 py-1.5 text-right font-semibold">Spent</th>
                <th className="px-3 py-1.5 text-right font-semibold">
                  Left over
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="bg-lagoon-deep/6 text-sm text-sea-ink"
                >
                  <th
                    scope="row"
                    className="rounded-l-2xl px-3 py-3 text-left font-bold"
                  >
                    <span className="block">{row.label}</span>
                    {row.rangeLabel ? (
                      <span className="mt-0.5 block text-[0.8rem] font-normal text-sea-ink-soft">
                        {row.rangeLabel}
                      </span>
                    ) : null}
                  </th>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatBudgetMoney(row.income, currency)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatBudgetMoney(row.needs, currency)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatBudgetMoney(row.wants, currency)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatBudgetMoney(row.savings, currency)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatBudgetMoney(row.spent, currency)}
                  </td>
                  <td
                    className={cn(
                      'rounded-r-2xl px-3 py-3 text-right font-bold tabular-nums',
                      row.surplus < 0 ? 'text-coral-deep' : 'text-palm',
                    )}
                  >
                    <span className="inline-flex items-center justify-end gap-1">
                      {row.surplus < 0 ? (
                        <ArrowDownRight
                          className="size-3.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      )}
                      {formatBudgetMoney(Math.abs(row.surplus), currency)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl bg-lagoon-deep/6 px-4 py-8 text-center text-sm text-sea-ink-soft">
          Finish a payday cycle to start building your history.
        </p>
      )}
    </Card>
  )
}

function BudgetEditDialog({
  cycle,
  currency,
  open,
  draft,
  onOpenChange,
  onDraftChange,
  onManageIncomeSources,
  onSave,
}: {
  cycle: BudgetCycle
  currency: string
  open: boolean
  draft: BudgetDraft | undefined
  onOpenChange: (open: boolean) => void
  onDraftChange: (draft: BudgetDraft) => void
  onManageIncomeSources?: () => void
  onSave: (update: BudgetPlanUpdate) => void | Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!draft) return null

  const handleAmountChange =
    (field: 'spendingLimit') => (event: ChangeEvent<HTMLInputElement>) => {
      onDraftChange({ ...draft, [field]: event.target.value })
    }

  const handleCategoryChange =
    (id: string) => (event: ChangeEvent<HTMLInputElement>) => {
      onDraftChange({
        ...draft,
        categoryPlans: { ...draft.categoryPlans, [id]: event.target.value },
      })
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const spendingLimit = parseAmount(draft.spendingLimit)
    const categoryPlans = cycle.categories.map((category) => ({
      categoryId: category.id,
      plannedAmount: parseAmount(draft.categoryPlans[category.id] ?? ''),
    }))
    const categoryTotal = categoryPlans.reduce(
      (sum, plan) => sum + plan.plannedAmount,
      0,
    )
    if (categoryTotal > spendingLimit) {
      setSaveError(
        `Category plans exceed the spending limit by ${formatBudgetMoney(categoryTotal - spendingLimit, currency)}.`,
      )
      return
    }

    const update = {
      cycleId: cycle.id,
      spendingLimit,
      categoryPlans,
    } satisfies BudgetPlanUpdate

    setSaveError(null)
    setSaving(true)
    try {
      await onSave(update)
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Unable to save this cycle plan.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (saving) return
    setSaveError(null)
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        sheet
        className="max-h-[min(90vh,760px)] max-w-2xl rounded-3xl border-(--line) bg-(--surface-strong)"
      >
        <DialogHeader className="pr-8 text-left">
          <p className="island-kicker">Edit plan · {cycle.label}</p>
          <DialogTitle className="font-display mt-1 text-2xl font-bold tracking-tight text-sea-ink">
            Make this cycle work for you
          </DialogTitle>
          <DialogDescription className="text-sea-ink-soft">
            Set the spending limit and category plans. Savings is derived from
            each income source&apos;s rate. New cycles start from last
            cycle&apos;s actual spend so you can adjust from real numbers.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <section className="space-y-3" aria-labelledby="budget-plan-totals">
            <div>
              <h3
                id="budget-plan-totals"
                className="text-sm font-extrabold text-sea-ink"
              >
                Cycle totals
              </h3>
              <p className="mt-1 text-xs text-sea-ink-soft">
                Keep savings separate from the spending limit.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Label
                htmlFor="budget-spending-limit"
                className="flex flex-col items-stretch gap-1.5 font-normal normal-case tracking-normal select-text"
              >
                <span className="text-xs font-bold text-sea-ink-soft">
                  Spending limit ({currency})
                </span>
                <Input
                  id="budget-spending-limit"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={draft.spendingLimit}
                  onChange={handleAmountChange('spendingLimit')}
                />
                {hasPreviousCycle(cycle) ? (
                  <span className="text-[0.68rem] text-sea-ink-soft">
                    Last cycle spent{' '}
                    {formatBudgetMoney(
                      positiveAmount(cycle.previousActualSpending),
                      currency,
                    )}
                  </span>
                ) : null}
              </Label>
              <div className="rounded-xl border border-(--line) bg-(--chip-bg) px-3 py-2.5">
                <p className="text-xs font-bold text-sea-ink-soft">
                  Derived savings target
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-palm tabular-nums">
                  {formatBudgetMoney(
                    plannedSavingsTotal(cycle.incomeSources),
                    currency,
                  )}
                </p>
                <p className="mt-0.5 text-[0.68rem] text-sea-ink-soft">
                  Sum of expected income × each source rate
                </p>
              </div>
            </div>
          </section>

          <section
            className="space-y-3"
            aria-labelledby="budget-plan-categories"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3
                  id="budget-plan-categories"
                  className="text-sm font-extrabold text-sea-ink"
                >
                  Category plans
                </h3>
                <p className="mt-1 text-xs text-sea-ink-soft">
                  These amounts make up your spending limit.
                </p>
              </div>
              {canApplyPreviousSpend(cycle) ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="max-sm:h-10"
                  onClick={() =>
                    onDraftChange(applyPreviousSpend(cycle, draft))
                  }
                >
                  Use last cycle&apos;s spend
                </Button>
              ) : null}
            </div>
            <div className="space-y-2.5">
              {cycle.categories.length > 0 ? (
                cycle.categories.map((category) => (
                  <Label
                    key={category.id}
                    htmlFor={`budget-category-${category.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-(--line) bg-(--chip-bg) px-3.5 py-3 font-normal normal-case tracking-normal select-text"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-sea-ink">
                        {category.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-sea-ink-soft">
                        {GROUP_META[category.group].label}
                        {hasPreviousCycle(cycle)
                          ? ` · last cycle ${formatBudgetMoney(positiveAmount(category.previousSpent), currency)}`
                          : ''}
                      </span>
                    </span>
                    <span className="flex w-32 items-center gap-2">
                      <span className="text-xs font-semibold text-sea-ink-soft">
                        {currency}
                      </span>
                      <Input
                        id={`budget-category-${category.id}`}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={draft.categoryPlans[category.id] ?? ''}
                        onChange={handleCategoryChange(category.id)}
                        aria-label={`${category.name} planned amount`}
                        className="h-10"
                      />
                    </span>
                  </Label>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-(--line) px-4 py-4 text-sm text-sea-ink-soft">
                  Add categories to shape this cycle.
                </p>
              )}
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="budget-plan-income">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3
                  id="budget-plan-income"
                  className="text-sm font-extrabold text-sea-ink"
                >
                  Income plans
                </h3>
                <p className="mt-1 text-xs text-sea-ink-soft">
                  Expected amounts and savings rates are managed with your
                  income sources.
                </p>
              </div>
              {onManageIncomeSources ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="max-sm:h-10"
                  onClick={() => {
                    handleOpenChange(false)
                    onManageIncomeSources()
                  }}
                >
                  Manage income sources
                </Button>
              ) : null}
            </div>
            <div className="space-y-2.5">
              {(cycle.incomeSources ?? []).length > 0 ? (
                (cycle.incomeSources ?? []).map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center gap-3 rounded-2xl border border-(--line) bg-(--chip-bg) px-3.5 py-3"
                  >
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-xl bg-palm/10 text-palm"
                      aria-hidden="true"
                    >
                      <Banknote className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-sea-ink">
                        {source.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-sea-ink-soft">
                        {formatBudgetMoney(
                          positiveAmount(source.expectedAmount),
                          currency,
                        )}
                        {source.expectedAmountMax === undefined
                          ? ''
                          : `–${formatBudgetMoney(positiveAmount(source.expectedAmountMax), currency)}`}
                        {' · '}
                        {Math.round(Math.max(0, source.savingsRate) * 100)}%
                        saved
                      </span>
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-(--line) px-4 py-4 text-sm text-sea-ink-soft">
                  Add an income source to plan paydays independently.
                </p>
              )}
            </div>
          </section>

          {saveError && (
            <p
              role="alert"
              className="rounded-xl border border-coral/25 bg-coral/8 px-3.5 py-3 text-sm font-semibold text-coral-deep"
            >
              {saveError}
            </p>
          )}

          <DialogFooter sticky className="flex-row justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Check aria-hidden="true" />
              {saving ? 'Saving…' : 'Save cycle plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PageTitle() {
  return (
    <h1 className="font-display mt-1 text-[1.75rem] font-bold tracking-tight text-sea-ink sm:text-4xl">
      Budget
    </h1>
  )
}

function EmptyBudgetState() {
  return (
    <>
      <header>
        <p className="text-sm text-sea-ink-soft">Plan your paydays</p>
        <PageTitle />
      </header>
      <Card
        variant="panel"
        className="mt-5 max-w-xl items-center gap-4 p-8 text-center sm:mt-6 sm:p-10"
      >
        <span
          className="grid size-14 place-items-center rounded-2xl bg-lagoon-deep/12 text-lagoon-deep"
          aria-hidden="true"
        >
          <WalletCards className="size-7" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-sea-ink">
            Your budget starts with a cycle
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-sea-ink-soft">
            Create a payday cycle to plan income, savings, and spending in one
            place.
          </p>
        </div>
      </Card>
    </>
  )
}

export function BudgetPage({
  cycles,
  history = [],
  currentCycleId,
  currency = 'K',
  defaultTab = 'current',
  className,
  onCycleChange,
  onTabChange,
  onManageIncomeSources,
  onSavePlan,
}: BudgetPageProps) {
  const selectedCycle =
    cycles.find((cycle) => cycle.id === currentCycleId) ?? cycles.at(0)
  const [activeTab, setActiveTab] = useState<BudgetTab>(defaultTab)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState<BudgetDraft | undefined>()

  if (!selectedCycle) {
    return (
      <div className={cn('w-full', className)}>
        <EmptyBudgetState />
      </div>
    )
  }

  const expectedIncome = positiveAmount(selectedCycle.expectedIncome)
  const actualIncome = positiveAmount(selectedCycle.actualIncome)
  const plannedSavings = plannedSavingsTotal(selectedCycle.incomeSources)
  const actualSavings = positiveAmount(selectedCycle.actualSavings)
  const spendingLimit = positiveAmount(selectedCycle.spendingLimit)
  const unallocated = expectedIncome - plannedSavings - spendingLimit
  const totalSpent =
    selectedCycle.actualSpending ??
    selectedCycle.categories.reduce(
      (total, category) => total + positiveAmount(category.spent),
      0,
    )

  const openEdit = () => {
    if (selectedCycle.isClosed) return
    setDraft(createDraft(selectedCycle))
    setDialogOpen(true)
  }

  const handleTabChange = (value: string) => {
    if (value !== 'current' && value !== 'history') return
    const nextTab = value
    setActiveTab(nextTab)
    onTabChange?.(nextTab)
  }

  const handleSavePlan = async (update: BudgetPlanUpdate) => {
    await onSavePlan?.(update)
    setDialogOpen(false)
  }

  return (
    <div className={cn('w-full', className)}>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="text-sm text-sea-ink-soft">
            {selectedCycle.rangeLabel ?? selectedCycle.label}
          </p>
          <PageTitle />
        </div>
        <div className="flex w-full items-center gap-2.5 sm:w-auto">
          <Select value={selectedCycle.id} onValueChange={onCycleChange}>
            <SelectTrigger
              className="min-w-0 flex-1 sm:w-[190px] sm:flex-none"
              aria-label="Choose budget cycle"
            >
              <CalendarDays className="size-4" aria-hidden="true" />
              <SelectValue placeholder="Choose cycle" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  {cycle.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={selectedCycle.isClosed ? 'secondary' : 'default'}
            disabled={selectedCycle.isClosed}
            onClick={openEdit}
          >
            <Pencil aria-hidden="true" />
            {selectedCycle.isClosed ? 'Cycle ended' : 'Edit plan'}
          </Button>
        </div>
      </header>

      <div className="mt-5 sm:mt-6">
        <BudgetHero
          cycle={selectedCycle}
          totalSpent={totalSpent}
          currency={currency}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-3">
        <StatTile
          label="Income expected"
          value={formatBudgetMoney(expectedIncome, currency)}
          detail={
            actualIncome > 0
              ? `${formatBudgetMoney(actualIncome, currency)} arrived so far`
              : 'Nothing arrived yet'
          }
        />
        <StatTile
          label="To save"
          value={formatBudgetMoney(plannedSavings, currency)}
          detail={
            actualSavings > 0
              ? `${formatBudgetMoney(actualSavings, currency)} saved so far`
              : 'Your savings goal this cycle'
          }
        />
        <StatTile
          className="col-span-2 lg:col-span-1"
          label={unallocated < 0 ? 'Planned too much' : 'Not planned yet'}
          value={formatBudgetMoney(Math.abs(unallocated), currency)}
          warn={unallocated < 0}
          detail={
            unallocated < 0
              ? 'Lower a plan so it fits your income'
              : 'Give it a job, or keep it spare'
          }
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="mt-5 gap-4 sm:mt-6 sm:gap-6"
      >
        <TabsList aria-label="Budget views" className="h-11 max-sm:w-full">
          <TabsTrigger value="current" className="px-4">
            This cycle
          </TabsTrigger>
          <TabsTrigger value="history" className="px-4">
            Past cycles
          </TabsTrigger>
        </TabsList>

        {/* The category list takes the wide column; the income map and
            sources stack on the right from `xl`. */}
        <TabsContent
          value="current"
          className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start"
        >
          <CategoryPlanCard cycle={selectedCycle} currency={currency} />
          <div className="grid gap-4 sm:gap-6">
            <AllocationCard cycle={selectedCycle} currency={currency} />
            <IncomeSourcesCard
              cycle={selectedCycle}
              currency={currency}
              onManage={onManageIncomeSources}
            />
          </div>
        </TabsContent>
        <TabsContent value="history">
          <HistoryCard rows={history} currency={currency} />
        </TabsContent>
      </Tabs>

      <BudgetEditDialog
        key={selectedCycle.id}
        cycle={selectedCycle}
        currency={currency}
        open={dialogOpen}
        draft={draft}
        onOpenChange={setDialogOpen}
        onDraftChange={setDraft}
        onManageIncomeSources={onManageIncomeSources}
        onSave={handleSavePlan}
      />
    </div>
  )
}
