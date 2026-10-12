import {
  hasPreviousSpend,
  seedCycleBudgetsFromPrevious,
  spendingLimitForPlans,
} from '@misi/shared/budget-rollover'
import { incomeSourceStatus } from '@misi/shared/income'

/*
 * Platform-agnostic budget data types and derivations. Web-only fields
 * (icons) are layered on in `#/components/budget/types`.
 */

export type BudgetGroup = 'needs' | 'wants'

export type BudgetTab = 'current' | 'history'

export type BudgetCategoryStatus =
  'on-track' | 'watch' | 'over-budget' | 'not-started'

export interface BudgetCategoryData {
  id: string
  name: string
  group: BudgetGroup
  planned: number
  spent: number
  previousSpent?: number
  color?: string
}

export interface BudgetIncomeSourceData {
  id: string
  name: string
  expectedAmount: number
  expectedAmountMax?: number
  actualAmount: number
  savingsRate: number
  status?: 'landed' | 'pending' | 'partial'
  note?: string
}

export interface BudgetCycleData {
  id: string
  label: string
  rangeLabel?: string
  expectedIncome: number
  actualIncome?: number
  unassignedIncome?: number
  actualSavings?: number
  actualSpending?: number
  isClosed?: boolean
  spendingLimit: number
  categories: readonly BudgetCategoryData[]
  incomeSources?: readonly BudgetIncomeSourceData[]
  daysElapsed?: number
  totalDays?: number
  previousActualSpending?: number
}

export interface BudgetHistoryRow {
  id: string
  label: string
  rangeLabel?: string
  income: number
  needs: number
  wants: number
  savings: number
  spent: number
  surplus: number
}

export interface BudgetPlanUpdate {
  cycleId: string
  spendingLimit: number
  categoryPlans: readonly BudgetCategoryPlanUpdate[]
  incomePlans?: readonly BudgetIncomePlanUpdate[]
}

export interface BudgetCategoryPlanUpdate {
  categoryId: string
  plannedAmount: number
}

export interface BudgetIncomePlanUpdate {
  sourceId: string
  expectedAmount: number
  expectedAmountMax?: number
  savingsRate: number
}

export interface BudgetDraft {
  spendingLimit: string
  categoryPlans: Record<string, string>
}

export interface CategoryInsight {
  remaining: number
  spentPercent: number
  incomePercent: number
  status: BudgetCategoryStatus
  statusLabel: string
  forecast: string
  projected: number | null
}

export type IncomeSourceStatusLabel = 'Landed' | 'Part landed' | 'Pending'

export const BUDGET_GROUPS: readonly BudgetGroup[] = ['needs', 'wants']

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

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))
}

export function positiveAmount(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0
}

export function parseAmount(value: string) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : 0
}

export function groupTotal(
  categories: readonly BudgetCategoryData[],
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

export function plannedSavingsTotal(
  incomeSources: readonly BudgetIncomeSourceData[] | undefined,
) {
  return (incomeSources ?? []).reduce(
    (total, source) =>
      total +
      positiveAmount(source.expectedAmount) * Math.max(0, source.savingsRate),
    0,
  )
}

export function hasPreviousCycle(cycle: BudgetCycleData) {
  return cycle.previousActualSpending !== undefined
}

export function canApplyPreviousSpend(cycle: BudgetCycleData) {
  return hasPreviousSpend({
    previousActualSpending: cycle.previousActualSpending,
    categorySpent: cycle.categories.map((category) =>
      positiveAmount(category.previousSpent),
    ),
  })
}

export function applyPreviousSpend(
  cycle: BudgetCycleData,
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

export function createDraft(cycle: BudgetCycleData): BudgetDraft {
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

export function withDraftSpendingLimit(
  draft: BudgetDraft,
  value: string,
): BudgetDraft {
  return { ...draft, spendingLimit: value }
}

export function withDraftCategoryPlan(
  draft: BudgetDraft,
  categoryId: string,
  value: string,
): BudgetDraft {
  return {
    ...draft,
    categoryPlans: { ...draft.categoryPlans, [categoryId]: value },
  }
}

/** Validates a draft and turns it into the update sent to the backend. */
export function buildPlanUpdate(
  cycle: BudgetCycleData,
  draft: BudgetDraft,
  currency: string,
): { ok: true; update: BudgetPlanUpdate } | { ok: false; error: string } {
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
    return {
      ok: false,
      error: `Category plans exceed the spending limit by ${formatBudgetMoney(categoryTotal - spendingLimit, currency)}.`,
    }
  }

  return {
    ok: true,
    update: {
      cycleId: cycle.id,
      spendingLimit,
      categoryPlans,
    } satisfies BudgetPlanUpdate,
  }
}

export function cycleProgress(cycle: BudgetCycleData) {
  const elapsed = positiveAmount(cycle.daysElapsed)
  const total = positiveAmount(cycle.totalDays)
  return total > 0 ? clampPercent((elapsed / total) * 100) : 0
}

/** Headline numbers for the selected cycle. */
export function getBudgetSummary(cycle: BudgetCycleData) {
  const expectedIncome = positiveAmount(cycle.expectedIncome)
  const actualIncome = positiveAmount(cycle.actualIncome)
  const plannedSavings = plannedSavingsTotal(cycle.incomeSources)
  const actualSavings = positiveAmount(cycle.actualSavings)
  const spendingLimit = positiveAmount(cycle.spendingLimit)
  const unallocated = expectedIncome - plannedSavings - spendingLimit
  const totalSpent =
    cycle.actualSpending ??
    cycle.categories.reduce(
      (total, category) => total + positiveAmount(category.spent),
      0,
    )
  const spendingRemaining = spendingLimit - totalSpent
  const progress = cycleProgress(cycle)
  const paceLabel =
    cycle.daysElapsed !== undefined && cycle.totalDays !== undefined
      ? `Day ${Math.max(0, Math.round(cycle.daysElapsed))} of ${Math.max(0, Math.round(cycle.totalDays))}`
      : (cycle.rangeLabel ?? 'Payday cycle')
  const spentPercent =
    spendingLimit > 0 ? (totalSpent / spendingLimit) * 100 : 0

  return {
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
  }
}

export type AllocationSegmentKey = 'needs' | 'wants' | 'savings' | 'unallocated'

/** How expected income splits across needs, wants, savings and the rest. */
export function getAllocation(cycle: BudgetCycleData) {
  const expectedIncome = positiveAmount(cycle.expectedIncome)
  const needs = groupTotal(cycle.categories, 'needs')
  const wants = groupTotal(cycle.categories, 'wants')
  const savings = plannedSavingsTotal(cycle.incomeSources)
  const spendingLimit = positiveAmount(cycle.spendingLimit)
  const allocated = needs + wants + savings
  const unallocated = expectedIncome - allocated
  const segments: {
    key: AllocationSegmentKey
    label: string
    amount: number
  }[] = [
    { key: 'needs', label: 'Needs', amount: needs },
    { key: 'wants', label: 'Wants', amount: wants },
    { key: 'savings', label: 'Savings', amount: savings },
    {
      key: 'unallocated',
      label: unallocated < 0 ? 'Over-allocated' : 'Unallocated',
      amount: Math.abs(unallocated),
    },
  ]

  return {
    expectedIncome,
    needs,
    wants,
    spendingLimit,
    unallocated,
    segments,
  }
}

/** Share of expected income, or 0 when there is no expected income. */
export function incomeShare(amount: number, expectedIncome: number) {
  return expectedIncome > 0 ? (amount / expectedIncome) * 100 : 0
}

export function groupBudgetCategories<TCategory extends BudgetCategoryData>(
  categories: readonly TCategory[],
) {
  return BUDGET_GROUPS.map((group) => ({
    group,
    categories: categories.filter((category) => category.group === group),
  }))
}

export function getCategoryInsight(
  category: BudgetCategoryData,
  cycle: BudgetCycleData,
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

export function getIncomeSourceStatus(
  source: BudgetIncomeSourceData,
): IncomeSourceStatusLabel {
  const planned = positiveAmount(source.expectedAmount)
  const actual = positiveAmount(source.actualAmount)
  const status = incomeSourceStatus(actual, planned)
  if (status === 'landed') return 'Landed'
  if (status === 'partial') return 'Part landed'
  return 'Pending'
}

/** Planned vs landed progress for one income source. */
export function getIncomeSourceProgress(source: BudgetIncomeSourceData) {
  const planned = positiveAmount(source.expectedAmount)
  const actual = positiveAmount(source.actualAmount)
  const progress = planned > 0 ? clampPercent((actual / planned) * 100) : 0
  return { planned, actual, progress, status: getIncomeSourceStatus(source) }
}

/** Planned vs landed income across all sources, including unassigned income. */
export function getIncomeSummary(cycle: BudgetCycleData) {
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
  return { planned, unassigned, actualTotal, actualPercent }
}
