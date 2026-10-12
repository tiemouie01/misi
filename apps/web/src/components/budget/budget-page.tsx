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
import {
  applyPreviousSpend,
  canApplyPreviousSpend,
  clampPercent,
  formatBudgetMoney,
  formatBudgetPercent,
  getAllocation,
  getBudgetSummary,
  getCategoryInsight,
  getIncomeSourceProgress,
  getIncomeSummary,
  groupBudgetCategories,
  groupTotal,
  hasPreviousCycle,
  incomeShare,
  plannedSavingsTotal,
  positiveAmount,
  withDraftCategoryPlan,
  withDraftSpendingLimit,
} from '#/hooks/budget'
import { useBudgetPage, useBudgetPlanEditor } from '#/hooks/use-budget-page'
import { cn } from '#/lib/utils'

import type { ChangeEvent, FormEvent } from 'react'
import type {
  AllocationSegmentKey,
  BudgetCategoryStatus,
  BudgetDraft,
  BudgetGroup,
  CategoryInsight,
} from '#/hooks/budget'
import type {
  BudgetCategoryPlan,
  BudgetCycle,
  BudgetHistoryRow,
  BudgetPageProps,
  BudgetPlanUpdate,
} from './types'

export { formatBudgetMoney, formatBudgetPercent } from '#/hooks/budget'

interface SummaryCardProps {
  label: string
  value: string
  detail: string
  /** Shorter detail shown below `sm`; omitted means no detail on mobile. */
  compactDetail?: string
  icon: typeof WalletCards
  tone?: 'lagoon' | 'palm' | 'coral' | 'sun'
}

const GROUP_META: Record<BudgetGroup, { label: string; color: string }> = {
  needs: { label: 'Needs', color: 'var(--lagoon-deep)' },
  wants: { label: 'Wants', color: 'var(--coral)' },
}

const SEGMENT_COLORS: Record<
  Exclude<AllocationSegmentKey, 'unallocated'>,
  string
> = {
  needs: 'var(--lagoon-deep)',
  wants: 'var(--coral)',
  savings: 'var(--palm)',
}

const TONE_CLASSES: Record<NonNullable<SummaryCardProps['tone']>, string> = {
  lagoon: 'bg-lagoon-deep/12 text-lagoon-deep',
  palm: 'bg-palm/12 text-palm',
  coral: 'bg-coral/12 text-coral-deep',
  sun: 'bg-sun/14 text-sun',
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
  compactDetail,
  icon: Icon,
  tone = 'lagoon',
}: SummaryCardProps) {
  return (
    <Card
      variant="island"
      className="min-w-0 gap-1 rounded-2xl p-3.5 sm:gap-3 sm:rounded-3xl sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="island-kicker leading-snug">{label}</p>
        <span
          className={cn(
            'grid size-9 place-items-center rounded-xl max-sm:hidden',
            TONE_CLASSES[tone],
          )}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="font-display text-lg font-bold tracking-tight wrap-anywhere text-sea-ink tabular-nums sm:text-3xl">
        {value}
      </p>
      <p className="text-xs leading-relaxed text-sea-ink-soft max-sm:hidden">
        {detail}
      </p>
      {compactDetail ? (
        <p className="text-xs leading-snug text-sea-ink-soft sm:hidden">
          {compactDetail}
        </p>
      ) : null}
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
  const allocation = getAllocation(cycle)
  const { expectedIncome, needs, wants, spendingLimit, unallocated } =
    allocation
  const segments = allocation.segments.map((segment) => ({
    ...segment,
    color:
      segment.key === 'unallocated'
        ? unallocated < 0
          ? 'var(--coral-deep)'
          : 'var(--sun)'
        : SEGMENT_COLORS[segment.key],
  }))

  return (
    <Card variant="island" className="gap-4 rounded-3xl p-4 sm:gap-5 sm:p-6">
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
        <div>
          <p className="island-kicker">Allocation map</p>
          <h2 className="font-display mt-1.5 text-lg font-bold sm:text-xl tracking-tight text-sea-ink">
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
            const width = clampPercent(
              incomeShare(segment.amount, expectedIncome),
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
        ) : (
          <span className="h-full w-full bg-(--line)" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-3 xl:grid-cols-4">
        {segments.map((segment) => {
          const percent = incomeShare(segment.amount, expectedIncome)
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
    <article className="rounded-2xl border border-(--line) bg-(--chip-bg) p-3 transition-colors sm:p-4 hover:border-lagoon-deep/35">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl sm:size-9"
          style={{
            color,
            background: `color-mix(in oklab, ${color} 14%, transparent)`,
          }}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-x-2 gap-y-1 sm:flex-wrap sm:gap-x-3">
            <h4 className="truncate text-sm font-bold text-sea-ink">
              {category.name}
            </h4>
            <Badge
              variant={statusBadgeVariant(insight.status)}
              className={cn(
                'shrink-0',
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
            className="mt-2 h-2 overflow-hidden rounded-full bg-(--line) sm:mt-3"
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
          <div className="mt-2 flex items-baseline justify-between gap-3 font-mono text-xs font-semibold text-sea-ink-soft tabular-nums sm:hidden">
            <span>
              {formatBudgetMoney(category.spent, currency)} of{' '}
              {formatBudgetMoney(category.planned, currency)}
            </span>
            <span
              className={cn(
                'text-right',
                insight.remaining < 0 ? 'text-coral-deep' : 'text-sea-ink',
              )}
            >
              {formatBudgetMoney(Math.abs(insight.remaining), currency)}{' '}
              {insight.remaining < 0 ? 'over' : 'left'}
            </span>
          </div>
          <div className="mt-3 hidden gap-x-4 gap-y-2 sm:grid sm:grid-cols-4">
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
          <p className="mt-3 hidden items-center gap-1.5 text-xs font-semibold text-sea-ink-soft sm:flex">
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
  const grouped = groupBudgetCategories(cycle.categories)

  return (
    <Card
      variant="island"
      className="min-w-0 gap-4 rounded-3xl p-4 sm:gap-5 sm:p-6"
    >
      <CardHeader className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="island-kicker">Spending plan</p>
            <CardTitle className="mt-1.5 text-xl">Needs and wants</CardTitle>
            <CardDescription className="mt-1 max-sm:hidden">
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
  const { planned, unassigned, actualTotal, actualPercent } =
    getIncomeSummary(cycle)
  const unassignedNotice =
    unassigned > 0 ? (
      <div className="rounded-2xl border border-dashed border-sun/40 bg-sun/8 px-3.5 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-sea-ink">Unassigned income</span>
          <span className="font-mono font-bold text-sea-ink tabular-nums">
            {formatBudgetMoney(unassigned, currency)}
          </span>
        </div>
        <p className="mt-1 text-xs text-sea-ink-soft">
          Included in the cycle total, but not attributed to a planned source.
        </p>
      </div>
    ) : null

  return (
    <Card
      variant="island"
      className="min-w-0 gap-4 rounded-3xl p-4 sm:gap-5 sm:p-6"
    >
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
                className="max-sm:h-10 max-sm:px-4"
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
                <span>
                  {formatBudgetMoney(actualTotal, currency)} landed total
                </span>
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
                const {
                  planned: sourcePlan,
                  actual: sourceActual,
                  progress: sourceProgress,
                  status,
                } = getIncomeSourceProgress(source)
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
            {unassignedNotice}
          </>
        ) : (
          <>
            {unassignedNotice}
            <div className="rounded-2xl border border-dashed border-(--line) px-4 py-5 text-sm text-sea-ink-soft">
              No income sources have been added to this cycle yet.
            </div>
          </>
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
  const {
    saving,
    saveError,
    submit,
    requestOpenChange: handleOpenChange,
  } = useBudgetPlanEditor({ cycle, currency, onOpenChange, onSave })

  if (!draft) return null

  const handleSpendingLimitChange = (event: ChangeEvent<HTMLInputElement>) => {
    onDraftChange(withDraftSpendingLimit(draft, event.target.value))
  }

  const handleCategoryChange =
    (id: string) => (event: ChangeEvent<HTMLInputElement>) => {
      onDraftChange(withDraftCategoryPlan(draft, id, event.target.value))
    }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submit(draft)
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
                  onChange={handleSpendingLimitChange}
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
  const {
    selectedCycle,
    activeTab,
    changeTab: handleTabChange,
    dialogOpen,
    setDialogOpen,
    draft,
    setDraft,
    openEdit,
    savePlan: handleSavePlan,
  } = useBudgetPage({
    cycles,
    currentCycleId,
    defaultTab,
    onTabChange,
    onSavePlan,
  })

  if (!selectedCycle) {
    return (
      <div className={cn('w-full', className)}>
        <EmptyBudgetState />
      </div>
    )
  }

  const {
    expectedIncome,
    actualIncome,
    plannedSavings,
    actualSavings,
    spendingLimit,
    unallocated,
    totalSpent,
    spendingRemaining,
    progress,
    paceLabel,
    spentPercent,
  } = getBudgetSummary(selectedCycle)

  return (
    <div className={cn('w-full', className)}>
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <header className="flex flex-col justify-between gap-4 sm:gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="island-kicker">Plan your paydays</p>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
              Budget
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-sea-ink-soft max-sm:hidden">
              A calm view of what can be spent, saved, and carried forward this
              cycle.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Select value={selectedCycle.id} onValueChange={onCycleChange}>
              <SelectTrigger
                className="min-w-0 flex-1 sm:w-[190px] sm:flex-none"
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

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="gap-4 sm:gap-5"
        >
          <TabsList
            aria-label="Budget views"
            className="max-sm:order-first max-sm:h-12 max-sm:w-full max-sm:p-0.5"
          >
            <TabsTrigger value="current">Current plan</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-sea-ink-soft max-sm:order-first">
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

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
            <SummaryCard
              label="Expected income"
              value={formatBudgetMoney(expectedIncome, currency)}
              detail={
                actualIncome > 0
                  ? `${formatBudgetMoney(actualIncome, currency)} landed so far`
                  : 'No income landed yet'
              }
              compactDetail={
                actualIncome > 0
                  ? `${formatBudgetMoney(actualIncome, currency)} landed`
                  : 'None landed yet'
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
              compactDetail={
                actualSavings > 0
                  ? `${formatBudgetMoney(actualSavings, currency)} saved`
                  : undefined
              }
              icon={PiggyBank}
              tone="palm"
            />
            <SummaryCard
              label="Spending limit"
              value={formatBudgetMoney(spendingLimit, currency)}
              detail={`${formatBudgetMoney(totalSpent, currency)} spent · ${formatBudgetMoney(Math.max(0, spendingRemaining), currency)} left`}
              compactDetail={
                spendingRemaining < 0
                  ? `${formatBudgetMoney(Math.abs(spendingRemaining), currency)} over`
                  : `${formatBudgetMoney(spendingRemaining, currency)} left`
              }
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

          <TabsContent value="current" className="space-y-5 sm:pt-2">
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
              className="gap-3 rounded-2xl p-4 max-sm:hidden sm:flex-row sm:items-center sm:justify-between"
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
                {formatBudgetPercent(spentPercent)} spent
              </span>
            </Card>
          </TabsContent>
          <TabsContent value="history" className="space-y-5 sm:pt-2">
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
        onManageIncomeSources={onManageIncomeSources}
        onSave={handleSavePlan}
      />
    </div>
  )
}
