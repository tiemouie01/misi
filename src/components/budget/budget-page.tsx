import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  CircleGauge,
  Landmark,
  Pencil,
  PiggyBank,
  ReceiptText,
  Target,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { useState } from 'react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
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

import type { ChangeEvent, FormEvent } from 'react'
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
  incomePlans: Partial<
    Record<
      string,
      {
        expectedAmount: string
        expectedAmountMax: string
        savingsRate: string
      }
    >
  >
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

interface SummaryCardProps {
  label: string
  value: string
  detail: string
  icon: typeof WalletCards
  tone?: 'lagoon' | 'palm' | 'coral' | 'sun'
}

const GROUPS: readonly BudgetGroup[] = ['needs', 'wants']

const GROUP_META: Record<BudgetGroup, { label: string; color: string }> = {
  needs: { label: 'Needs', color: 'var(--lagoon-deep)' },
  wants: { label: 'Wants', color: 'var(--coral)' },
}

const TONE_CLASSES: Record<NonNullable<SummaryCardProps['tone']>, string> = {
  lagoon: 'bg-lagoon-deep/12 text-lagoon-deep',
  palm: 'bg-palm/12 text-palm',
  coral: 'bg-coral/12 text-coral-deep',
  sun: 'bg-sun/14 text-sun',
}

export function formatBudgetMoney(value: number, currency = 'K') {
  const amount = Number.isFinite(value) ? value : 0
  const sign = amount < 0 ? '−' : ''
  return `${sign}${currency}${Math.round(Math.abs(amount)).toLocaleString('en-US')}`
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

function createDraft(cycle: BudgetCycle): BudgetDraft {
  return {
    spendingLimit: String(Math.max(0, Math.round(cycle.spendingLimit))),
    categoryPlans: Object.fromEntries(
      cycle.categories.map((category) => [
        category.id,
        String(Math.max(0, Math.round(category.planned))),
      ]),
    ),
    incomePlans: Object.fromEntries(
      (cycle.incomeSources ?? []).map((source) => [
        source.id,
        {
          expectedAmount: String(
            Math.max(0, Math.round(source.expectedAmount)),
          ),
          expectedAmountMax:
            source.expectedAmountMax === undefined
              ? ''
              : String(Math.max(0, Math.round(source.expectedAmountMax))),
          savingsRate: String(Math.max(0, source.savingsRate * 100)),
        },
      ]),
    ),
  }
}

function draftSavingsTotal(cycle: BudgetCycle, draft: BudgetDraft) {
  return (cycle.incomeSources ?? []).reduce((total, source) => {
    const plan = draft.incomePlans[source.id]
    if (!plan) return total
    const expectedAmount = parseAmount(plan.expectedAmount)
    const savingsRate = Math.min(1, parseAmount(plan.savingsRate) / 100)
    return total + expectedAmount * savingsRate
  }, 0)
}

function parseAmount(value: string) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : 0
}

function cycleProgress(cycle: BudgetCycle) {
  const elapsed = positiveAmount(cycle.daysElapsed)
  const total = positiveAmount(cycle.totalDays)
  return total > 0 ? clampPercent((elapsed / total) * 100) : 0
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

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'lagoon',
}: SummaryCardProps) {
  return (
    <Card variant="island" className="gap-3 rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="island-kicker">{label}</p>
        <span
          className={cn(
            'grid size-9 place-items-center rounded-xl',
            TONE_CLASSES[tone],
          )}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="font-display text-2xl font-bold tracking-tight text-sea-ink tabular-nums sm:text-3xl">
        {value}
      </p>
      <p className="text-xs leading-relaxed text-sea-ink-soft">{detail}</p>
    </Card>
  )
}

function AllocationBar({
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
      label: unallocated < 0 ? 'Over-allocated' : 'Unallocated',
      amount: Math.abs(unallocated),
      color: unallocated < 0 ? 'var(--coral-deep)' : 'var(--sun)',
    },
  ]

  return (
    <Card variant="island" className="gap-5 rounded-3xl p-6">
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
        <div>
          <p className="island-kicker">Allocation map</p>
          <h2 className="font-display mt-1.5 text-xl font-bold tracking-tight text-sea-ink">
            Give every kwacha a job
          </h2>
        </div>
        <p
          className={cn(
            'font-mono text-sm font-semibold tabular-nums',
            unallocated < 0 ? 'text-coral-deep' : 'text-sea-ink-soft',
          )}
        >
          {unallocated < 0
            ? `${formatBudgetMoney(Math.abs(unallocated), currency)} over`
            : `${formatBudgetMoney(unallocated, currency)} free`}
        </p>
      </div>

      <div
        className="flex h-4 w-full overflow-hidden rounded-full bg-(--line) ring-1 ring-(--line)"
        role="img"
        aria-label={`Income allocation: ${segments
          .map(
            (segment) =>
              `${segment.label} ${formatBudgetMoney(segment.amount, currency)}`,
          )
          .join(', ')}`}
      >
        {expectedIncome > 0 ? (
          segments.map((segment) => {
            const width = clampPercent((segment.amount / expectedIncome) * 100)
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
        ) : (
          <span className="h-full w-full bg-(--line)" />
        )}
      </div>

      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
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
                <p className="truncate text-xs font-semibold text-sea-ink-soft">
                  {segment.label}
                </p>
                <p className="font-mono text-sm font-bold text-sea-ink tabular-nums">
                  {formatBudgetMoney(segment.amount, currency)}{' '}
                  <span className="font-sans text-xs font-semibold text-sea-ink-soft">
                    {formatBudgetPercent(percent)}
                  </span>
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {expectedIncome === 0 ? (
        <p className="rounded-xl bg-sun/10 px-3.5 py-3 text-xs font-semibold text-sea-ink-soft">
          Add an expected income amount to see how this cycle is allocated.
        </p>
      ) : spendingLimit !== needs + wants ? (
        <p className="text-xs text-sea-ink-soft">
          Category plans total {formatBudgetMoney(needs + wants, currency)} of
          the {formatBudgetMoney(spendingLimit, currency)} spending limit.
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
    <article className="rounded-2xl border border-(--line) bg-(--chip-bg) p-4 transition-colors hover:border-lagoon-deep/35">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl"
          style={{
            color,
            background: `color-mix(in oklab, ${color} 14%, transparent)`,
          }}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h4 className="truncate text-sm font-bold text-sea-ink">
              {category.name}
            </h4>
            <Badge
              variant={statusBadgeVariant(insight.status)}
              className={cn(
                insight.status === 'watch' &&
                  'border-sun/35 bg-sun/12 text-sun',
              )}
              aria-label={`${insight.statusLabel}. ${insight.forecast}`}
            >
              {statusIndicator}
              {insight.statusLabel}
            </Badge>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-(--line)"
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
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Metric
              label="Plan"
              value={formatBudgetMoney(category.planned, currency)}
            />
            <Metric
              label="% income"
              value={formatBudgetPercent(insight.incomePercent)}
            />
            <Metric
              label="Spent"
              value={formatBudgetMoney(category.spent, currency)}
            />
            <Metric
              label={insight.remaining < 0 ? 'Over' : 'Remaining'}
              value={formatBudgetMoney(Math.abs(insight.remaining), currency)}
              valueClassName={
                insight.remaining < 0 ? 'text-coral-deep' : undefined
              }
            />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-sea-ink-soft">
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
      </div>
    </article>
  )
}

function Metric({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold tracking-wide text-sea-ink-soft/80 uppercase">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 font-mono text-sm font-semibold text-sea-ink tabular-nums',
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
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
    <Card variant="island" className="min-w-0 gap-5 rounded-3xl p-6">
      <CardHeader className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="island-kicker">Spending plan</p>
            <CardTitle className="mt-1.5 text-xl">Needs and wants</CardTitle>
            <CardDescription className="mt-1">
              {formatBudgetMoney(cycle.spendingLimit, currency)} available for
              planned spending.
            </CardDescription>
          </div>
          <span
            className="grid size-10 place-items-center rounded-xl bg-lagoon-deep/12 text-lagoon-deep"
            aria-hidden="true"
          >
            <CircleGauge className="size-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-0">
        {grouped.map(({ group, categories }) => (
          <section key={group} aria-labelledby={`budget-group-${group}`}>
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <h3
                id={`budget-group-${group}`}
                className="flex items-center gap-2 text-xs font-extrabold tracking-[0.1em] text-sea-ink-soft uppercase"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: GROUP_META[group].color }}
                  aria-hidden="true"
                />
                {GROUP_META[group].label}
              </h3>
              <span className="font-mono text-xs font-semibold text-sea-ink-soft tabular-nums">
                {formatBudgetMoney(
                  groupTotal(cycle.categories, group),
                  currency,
                )}
              </span>
            </div>
            <div className="space-y-2.5">
              {categories.length > 0 ? (
                categories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    insight={getCategoryInsight(
                      category,
                      cycle,
                      expectedIncome,
                    )}
                    currency={currency}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-(--line) px-4 py-4 text-sm text-sea-ink-soft">
                  No {GROUP_META[group].label.toLowerCase()} categories planned
                  yet.
                </div>
              )}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}

function getIncomeSourceStatus(source: BudgetIncomeSourcePlan) {
  const planned = positiveAmount(source.expectedAmount)
  const actual = positiveAmount(source.actualAmount)
  if (source.status === 'landed' || (planned > 0 && actual >= planned))
    return 'Landed'
  if (source.status === 'partial' || actual > 0) return 'Part landed'
  return 'Pending'
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
  const actualPercent = planned > 0 ? clampPercent((actual / planned) * 100) : 0

  return (
    <Card variant="island" className="min-w-0 gap-5 rounded-3xl p-6">
      <CardHeader className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="island-kicker">Income plan</p>
            <CardTitle className="mt-1.5 text-xl">Sources this cycle</CardTitle>
            <CardDescription className="mt-1">
              Plan each payday, then watch what actually lands.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onManage ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onManage}
              >
                Manage sources
              </Button>
            ) : null}
            <span
              className="grid size-10 place-items-center rounded-xl bg-palm/12 text-palm"
              aria-hidden="true"
            >
              <Landmark className="size-5" />
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        {sources.length > 0 ? (
          <>
            <div className="rounded-2xl border border-(--line) bg-(--chip-bg) p-4">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-sea-ink-soft">
                <span>{formatBudgetMoney(actual, currency)} landed</span>
                <span>{formatBudgetMoney(planned, currency)} planned</span>
              </div>
              <Progress
                value={actualPercent}
                aria-label="Income landed against plan"
                aria-valuetext={`${formatBudgetPercent(actualPercent)} of planned income landed`}
                className="mt-2 h-2 [&_[data-slot=progress-indicator]]:from-palm"
              />
            </div>
            <div className="space-y-2.5">
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
                  <div
                    key={source.id}
                    className="rounded-2xl border border-(--line) bg-(--chip-bg) p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-xl bg-palm/10 text-palm"
                        aria-hidden="true"
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-sea-ink">
                            {source.name}
                          </p>
                          <Badge
                            variant={
                              status === 'Landed'
                                ? 'success'
                                : status === 'Part landed'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {status === 'Landed' ? (
                              <Check aria-hidden="true" />
                            ) : null}
                            {status}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-sea-ink-soft">
                          <span>
                            Actual {formatBudgetMoney(sourceActual, currency)}
                          </span>
                          <span>
                            Plan {formatBudgetMoney(sourcePlan, currency)}
                          </span>
                        </div>
                        <Progress
                          value={sourceProgress}
                          aria-label={`${source.name} landed against plan`}
                          aria-valuetext={`${formatBudgetMoney(sourceActual, currency)} of ${formatBudgetMoney(sourcePlan, currency)} landed`}
                          className="mt-2 h-1.5 [&_[data-slot=progress-indicator]]:from-palm"
                        />
                        {source.note ? (
                          <p className="mt-2 text-xs text-sea-ink-soft">
                            {source.note}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-(--line) px-4 py-5 text-sm text-sea-ink-soft">
            No income sources have been added to this cycle yet.
          </div>
        )}
      </CardContent>
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
    <Card variant="island" className="gap-5 rounded-3xl p-6">
      <CardHeader className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="island-kicker">Cycle history</p>
            <CardTitle className="mt-1.5 text-xl">
              How your paydays are trending
            </CardTitle>
            <CardDescription className="mt-1">
              Compare actual results across closed payday cycles.
            </CardDescription>
          </div>
          <span
            className="grid size-10 place-items-center rounded-xl bg-lagoon-deep/12 text-lagoon-deep"
            aria-hidden="true"
          >
            <CalendarDays className="size-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length > 0 ? (
          <div className="-mx-2 overflow-x-auto px-2 pb-1">
            <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-left">
              <caption className="sr-only">
                Budget results for each payday cycle
              </caption>
              <thead>
                <tr className="text-[0.68rem] font-extrabold tracking-[0.1em] text-sea-ink-soft uppercase">
                  <th className="px-3 py-1.5 font-extrabold">Cycle</th>
                  <th className="px-3 py-1.5 text-right font-extrabold">
                    Income
                  </th>
                  <th className="px-3 py-1.5 text-right font-extrabold">
                    Needs
                  </th>
                  <th className="px-3 py-1.5 text-right font-extrabold">
                    Wants
                  </th>
                  <th className="px-3 py-1.5 text-right font-extrabold">
                    Savings
                  </th>
                  <th className="px-3 py-1.5 text-right font-extrabold">
                    Spent
                  </th>
                  <th className="px-3 py-1.5 text-right font-extrabold">
                    Surplus
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="rounded-2xl bg-(--chip-bg) text-sm text-sea-ink shadow-[0_1px_0_var(--line)]"
                  >
                    <th
                      scope="row"
                      className="rounded-l-2xl px-3 py-3 text-left font-bold"
                    >
                      <span className="block">{row.label}</span>
                      {row.rangeLabel ? (
                        <span className="mt-0.5 block text-xs font-normal text-sea-ink-soft">
                          {row.rangeLabel}
                        </span>
                      ) : null}
                    </th>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {formatBudgetMoney(row.income, currency)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {formatBudgetMoney(row.needs, currency)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {formatBudgetMoney(row.wants, currency)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {formatBudgetMoney(row.savings, currency)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {formatBudgetMoney(row.spent, currency)}
                    </td>
                    <td
                      className={cn(
                        'rounded-r-2xl px-3 py-3 text-right font-mono font-bold tabular-nums',
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
                          <ArrowUpRight
                            className="size-3.5"
                            aria-hidden="true"
                          />
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
          <div className="rounded-2xl border border-dashed border-(--line) px-4 py-8 text-center text-sm text-sea-ink-soft">
            Close a payday cycle to start building your history.
          </div>
        )}
      </CardContent>
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
  onSave,
}: {
  cycle: BudgetCycle
  currency: string
  open: boolean
  draft: BudgetDraft | undefined
  onOpenChange: (open: boolean) => void
  onDraftChange: (draft: BudgetDraft) => void
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

  const handleIncomeChange =
    (
      id: string,
      field: 'expectedAmount' | 'expectedAmountMax' | 'savingsRate',
    ) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const currentPlan = draft.incomePlans[id] ?? {
        expectedAmount: '',
        expectedAmountMax: '',
        savingsRate: '',
      }
      onDraftChange({
        ...draft,
        incomePlans: {
          ...draft.incomePlans,
          [id]: {
            ...currentPlan,
            [field]: event.target.value,
          },
        },
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
      incomePlans: (cycle.incomeSources ?? []).map((source) => {
        const incomePlan = draft.incomePlans[source.id] ?? {
          expectedAmount: '',
          expectedAmountMax: '',
          savingsRate: '',
        }
        const expectedAmount = parseAmount(incomePlan.expectedAmount)
        const expectedAmountMax = incomePlan.expectedAmountMax.trim()
        const maximum =
          expectedAmountMax.length > 0
            ? Math.max(expectedAmount, parseAmount(expectedAmountMax))
            : undefined
        return {
          sourceId: source.id,
          expectedAmount,
          ...(maximum === undefined ? {} : { expectedAmountMax: maximum }),
          savingsRate: Math.min(1, parseAmount(incomePlan.savingsRate) / 100),
        }
      }),
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
      <DialogContent className="max-h-[min(90vh,760px)] max-w-2xl overflow-y-auto rounded-3xl border-(--line) bg-(--surface-strong) p-5 sm:p-7">
        <DialogHeader className="pr-8 text-left">
          <p className="island-kicker">Edit plan · {cycle.label}</p>
          <DialogTitle className="font-display mt-1 text-2xl font-bold tracking-tight text-sea-ink">
            Make this cycle work for you
          </DialogTitle>
          <DialogDescription className="text-sea-ink-soft">
            Set the spending limit and income plans. Savings is derived from
            each source&apos;s rate and stays attached to this payday cycle.
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
              </Label>
              <div className="rounded-xl border border-(--line) bg-(--chip-bg) px-3 py-2.5">
                <p className="text-xs font-bold text-sea-ink-soft">
                  Derived savings target
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-palm tabular-nums">
                  {formatBudgetMoney(draftSavingsTotal(cycle, draft), currency)}
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
                        className="h-9"
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
            <div>
              <h3
                id="budget-plan-income"
                className="text-sm font-extrabold text-sea-ink"
              >
                Income plans
              </h3>
              <p className="mt-1 text-xs text-sea-ink-soft">
                Use the amount you expect to land for each source.
              </p>
            </div>
            <div className="space-y-2.5">
              {(cycle.incomeSources ?? []).length > 0 ? (
                (cycle.incomeSources ?? []).map((source) => (
                  <div
                    key={source.id}
                    className="rounded-2xl border border-(--line) bg-(--chip-bg) px-3.5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-xl bg-palm/10 text-palm"
                        aria-hidden="true"
                      >
                        <Banknote className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-sea-ink">
                        {source.name}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <Label
                        htmlFor={`budget-income-expected-${source.id}`}
                        className="flex flex-col items-stretch gap-1 font-normal normal-case tracking-normal select-text"
                      >
                        <span className="text-[0.68rem] font-bold text-sea-ink-soft">
                          Expected ({currency})
                        </span>
                        <Input
                          id={`budget-income-expected-${source.id}`}
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={
                            draft.incomePlans[source.id]?.expectedAmount ?? ''
                          }
                          onChange={handleIncomeChange(
                            source.id,
                            'expectedAmount',
                          )}
                          aria-label={`${source.name} expected income`}
                          className="h-9"
                        />
                      </Label>
                      <Label
                        htmlFor={`budget-income-max-${source.id}`}
                        className="flex flex-col items-stretch gap-1 font-normal normal-case tracking-normal select-text"
                      >
                        <span className="text-[0.68rem] font-bold text-sea-ink-soft">
                          Max ({currency}, optional)
                        </span>
                        <Input
                          id={`budget-income-max-${source.id}`}
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={
                            draft.incomePlans[source.id]?.expectedAmountMax ??
                            ''
                          }
                          onChange={handleIncomeChange(
                            source.id,
                            'expectedAmountMax',
                          )}
                          aria-label={`${source.name} maximum expected income`}
                          className="h-9"
                        />
                      </Label>
                      <Label
                        htmlFor={`budget-income-rate-${source.id}`}
                        className="flex flex-col items-stretch gap-1 font-normal normal-case tracking-normal select-text"
                      >
                        <span className="text-[0.68rem] font-bold text-sea-ink-soft">
                          Save rate (%)
                        </span>
                        <Input
                          id={`budget-income-rate-${source.id}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          inputMode="decimal"
                          value={
                            draft.incomePlans[source.id]?.savingsRate ?? ''
                          }
                          onChange={handleIncomeChange(
                            source.id,
                            'savingsRate',
                          )}
                          aria-label={`${source.name} savings rate`}
                          className="h-9"
                        />
                      </Label>
                    </div>
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

          <DialogFooter className="border-t border-(--line) pt-4">
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

function EmptyBudgetState() {
  return (
    <Card
      variant="island"
      className="mx-auto max-w-xl gap-4 rounded-3xl p-8 text-center sm:p-12"
    >
      <span
        className="mx-auto grid size-14 place-items-center rounded-2xl bg-lagoon-deep/12 text-lagoon-deep"
        aria-hidden="true"
      >
        <WalletCards className="size-7" />
      </span>
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-sea-ink">
          Your budget starts with a cycle
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-sea-ink-soft">
          Create a payday cycle to plan income, savings, and spending in one
          place.
        </p>
      </div>
    </Card>
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
  const spendingRemaining = spendingLimit - totalSpent
  const progress = cycleProgress(selectedCycle)
  const paceLabel =
    selectedCycle.daysElapsed !== undefined &&
    selectedCycle.totalDays !== undefined
      ? `Day ${Math.max(0, Math.round(selectedCycle.daysElapsed))} of ${Math.max(0, Math.round(selectedCycle.totalDays))}`
      : (selectedCycle.rangeLabel ?? 'Payday cycle')

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
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="island-kicker">Plan your paydays</p>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
              Budget
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-sea-ink-soft">
              A calm view of what can be spent, saved, and carried forward this
              cycle.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Select value={selectedCycle.id} onValueChange={onCycleChange}>
              <SelectTrigger
                className="w-full sm:w-[190px]"
                aria-label="Choose budget cycle"
              >
                <CalendarDays
                  className="size-4 text-lagoon-deep"
                  aria-hidden="true"
                />
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
              variant="secondary"
              disabled={selectedCycle.isClosed}
              onClick={openEdit}
            >
              <Pencil aria-hidden="true" />
              {selectedCycle.isClosed ? 'Closed cycle' : 'Edit plan'}
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-sea-ink-soft">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5">
            <CalendarDays
              className="size-3.5 text-lagoon-deep"
              aria-hidden="true"
            />
            {selectedCycle.rangeLabel ?? selectedCycle.label}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5">
            <CircleGauge className="size-3.5 text-palm" aria-hidden="true" />
            {paceLabel}
          </span>
          <span className="font-mono tabular-nums">
            {formatBudgetPercent(progress)} through cycle
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Expected income"
            value={formatBudgetMoney(expectedIncome, currency)}
            detail={
              actualIncome > 0
                ? `${formatBudgetMoney(actualIncome, currency)} landed so far`
                : 'No income landed yet'
            }
            icon={CircleDollarSign}
            tone="lagoon"
          />
          <SummaryCard
            label="Planned savings"
            value={formatBudgetMoney(plannedSavings, currency)}
            detail={
              actualSavings > 0
                ? `${formatBudgetMoney(actualSavings, currency)} saved so far`
                : 'Savings target for this cycle'
            }
            icon={PiggyBank}
            tone="palm"
          />
          <SummaryCard
            label="Spending limit"
            value={formatBudgetMoney(spendingLimit, currency)}
            detail={`${formatBudgetMoney(totalSpent, currency)} spent · ${formatBudgetMoney(Math.max(0, spendingRemaining), currency)} left`}
            icon={WalletCards}
            tone="coral"
          />
          <SummaryCard
            label={unallocated < 0 ? 'Over-allocated' : 'Unallocated'}
            value={formatBudgetMoney(Math.abs(unallocated), currency)}
            detail={
              unallocated < 0
                ? 'Trim a plan before this cycle starts'
                : 'Give this amount a job or keep it flexible'
            }
            icon={unallocated < 0 ? CircleAlert : Target}
            tone={unallocated < 0 ? 'coral' : 'sun'}
          />
        </div>

        <AllocationBar cycle={selectedCycle} currency={currency} />

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-1"
        >
          <TabsList aria-label="Budget views">
            <TabsTrigger value="current">Current plan</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="current" className="space-y-5 pt-4">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
              <CategoryPlanCard cycle={selectedCycle} currency={currency} />
              <IncomeSourcesCard
                cycle={selectedCycle}
                currency={currency}
                onManage={onManageIncomeSources}
              />
            </div>
            <Card
              variant="subtle"
              className="gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-lagoon-deep/12 text-lagoon-deep"
                  aria-hidden="true"
                >
                  <CircleGauge className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-sea-ink">
                    Spending pace
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-sea-ink-soft">
                    {spendingRemaining >= 0
                      ? `${formatBudgetMoney(spendingRemaining, currency)} remains across your planned categories.`
                      : `${formatBudgetMoney(Math.abs(spendingRemaining), currency)} over the spending limit. Review your categories.`}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'font-mono text-sm font-bold tabular-nums',
                  spendingRemaining < 0 ? 'text-coral-deep' : 'text-palm',
                )}
              >
                {formatBudgetPercent(
                  spendingLimit > 0 ? (totalSpent / spendingLimit) * 100 : 0,
                )}{' '}
                spent
              </span>
            </Card>
          </TabsContent>
          <TabsContent value="history" className="space-y-5 pt-4">
            <HistoryCard rows={history} currency={currency} />
          </TabsContent>
        </Tabs>
      </div>

      <BudgetEditDialog
        key={selectedCycle.id}
        cycle={selectedCycle}
        currency={currency}
        open={dialogOpen}
        draft={draft}
        onOpenChange={setDialogOpen}
        onDraftChange={setDraft}
        onSave={handleSavePlan}
      />
    </div>
  )
}
