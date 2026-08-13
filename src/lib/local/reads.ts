import { useQuery } from '@powersync/react'
import { useMemo } from 'react'

import type {
  AccountRow,
  AutoSaveEventRow,
  BudgetGroup,
  BudgetRow,
  CategoryRow,
  CycleIncomePlanRow,
  CycleRow,
  DebtRow,
  IncomeSourceRow,
  SettingsRow,
  TransactionRow,
  TransactionType,
} from './types'

/**
 * ID / field mapping for UI compatibility (see convex/misi bootstrap + routes):
 * - Entity PKs are local uuid `id` strings. We also set `_id` to the same value so
 *   existing UI that reads `doc._id` keeps working during migration.
 * - SQLite stores account/source refs as `*Uuid` columns. Domain objects expose
 *   those Uuid fields AND the Convex-era names the UI already reads
 *   (`accountId`, `toAccountId`, `sourceId`, `defaultExpenseAccountId`,
 *   `autoSaveSourceAccountId`, `transactionId`, etc.) with the same uuid strings.
 * - Optional Convex fields that are NULL in SQLite are omitted (`undefined`) so
 *   checks like `archivedAt !== undefined` keep working.
 * - Integer booleans (0/1) are converted to real booleans.
 */

function asBool(value: number | null | undefined): boolean {
  return value === 1
}

function optionalBool(
  value: number | null | undefined,
): boolean | undefined {
  if (value == null) return undefined
  return value === 1
}

function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value == null ? undefined : value
}

export type LocalCategory = {
  id: string
  _id: string
  key: string
  name: string
  icon: string
  color: string
  budgetGroup: BudgetGroup
  sortOrder: number
  isSystem: boolean
  archivedAt?: number
}

export type LocalAccount = {
  id: string
  _id: string
  name: string
  kind: AccountRow['kind']
  currency: AccountRow['currency']
  balance: number
  sortOrder: number
}

export type LocalCycle = {
  id: string
  _id: string
  label: string
  startsAt: number
  endsAt: number
  spendingLimit: number
}

export type LocalTransaction = {
  id: string
  _id: string
  cycleUuid: string
  type: TransactionType
  amount: number
  payee: string
  categoryId?: string
  /** UI-facing alias of `accountUuid`. */
  accountId: string
  accountUuid: string
  /** UI-facing alias of `toAccountUuid`. */
  toAccountId?: string
  toAccountUuid?: string
  walletId: string
  items?: string
  note?: string
  adjustment?: boolean
  autoSave?: boolean
  excludeFromBudget: boolean
  /** UI-facing alias of `sourceUuid`. */
  sourceId?: string
  sourceUuid?: string
  occurredAt: number
}

export type LocalBudget = {
  id: string
  _id: string
  cycleUuid: string
  categoryId: string
  plannedAmount: number
}

export type LocalIncomeSource = {
  id: string
  _id: string
  name: string
  expectedDayStart: number
  expectedDayEnd: number
  expectedAmount: number
  expectedAmountMax?: number
  savingsRate: number
  isAnchor: boolean
  sortOrder: number
  archivedAt?: number
}

export type LocalCycleIncomePlan = {
  id: string
  _id: string
  cycleUuid: string
  /** UI-facing alias of `sourceUuid`. */
  sourceId: string
  sourceUuid: string
  sourceName: string
  expectedDayStart: number
  expectedDayEnd: number
  expectedAmount: number
  expectedAmountMax?: number
  savingsRate: number
  isAnchor: boolean
}

export type LocalDebt = {
  id: string
  _id: string
  name: string
  balance: number
}

export type LocalSettings = {
  id: string
  _id: string
  usdRate: number
  defaultSavingsRate: number
  autoSaveSourceAccountUuid?: string
  /** UI-facing alias of `autoSaveSourceAccountUuid`. */
  autoSaveSourceAccountId?: string
  defaultExpenseAccountUuid?: string
  /** UI-facing alias of `defaultExpenseAccountUuid`. */
  defaultExpenseAccountId?: string
  defaultTransferFromAccountUuid?: string
  /** UI-facing alias of `defaultTransferFromAccountUuid`. */
  defaultTransferFromAccountId?: string
  defaultTransferToAccountUuid?: string
  /** UI-facing alias of `defaultTransferToAccountUuid`. */
  defaultTransferToAccountId?: string
  savingsOpeningBalance: number
  paydayDay?: number
  onboardedAt?: number
}

export type LocalPendingAutoSave = {
  /** Income transaction uuid (UI reads `transactionId`). */
  transactionId: string
  amount: number
  sourceName: string
  sourceId?: string
  savingsRate: number
  occurredAt: number
}

export type LocalBootstrapData = {
  settings: LocalSettings | null
  accounts: LocalAccount[]
  currentCycle: LocalCycle | null
  transactions: LocalTransaction[]
  budgets: LocalBudget[]
  cycleIncomePlans: LocalCycleIncomePlan[]
  incomeSources: LocalIncomeSource[]
  debts: LocalDebt[]
  categories: LocalCategory[]
  savingsBalance: number | null
  pendingAutoSave: LocalPendingAutoSave | null
}

export type LocalBudgetCategoryRow = {
  categoryId: string
  categoryName: string
  budgetGroup: BudgetGroup
  plannedAmount: number
  actualAmount: number
  variance: number
}

export type LocalBudgetIncomePlanRow = {
  sourceId: string
  sourceName: string
  expectedDayStart: number
  expectedDayEnd: number
  expectedAmount: number
  expectedAmountMax?: number
  savingsRate: number
  isAnchor: boolean
  actualAmount: number
  variance: number
}

export type LocalBudgetCycleView = {
  cycle: LocalCycle
  spendingLimit: number
  totalPlanned: number
  allocatedAmount: number
  unallocatedAmount: number
  plannedIncome: number
  actualIncome: number
  actualSpending: number
  actualSavings: number
  savingsTarget: number
  savingsVariance: number
  spendingVariance: number
  remainingAmount: number
  cashSurplusOrDeficit: number
  categoryRows: LocalBudgetCategoryRow[]
  incomePlans: LocalBudgetIncomePlanRow[]
}

export type LocalBudgetOverview = {
  cycles: LocalBudgetCycleView[]
}

export type LocalCategoryWithReference = LocalCategory & {
  referenced: boolean
}

function mapCategory(row: CategoryRow): LocalCategory {
  return {
    id: row.id,
    _id: row.id,
    key: row.key,
    name: row.name,
    icon: row.icon,
    color: row.color,
    budgetGroup: row.budgetGroup,
    sortOrder: row.sortOrder,
    isSystem: asBool(row.isSystem),
    archivedAt: nullToUndefined(row.archivedAt),
  }
}

function mapAccount(row: AccountRow): LocalAccount {
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    kind: row.kind,
    currency: row.currency,
    balance: row.balance,
    sortOrder: row.sortOrder,
  }
}

function mapCycle(row: CycleRow): LocalCycle {
  return {
    id: row.id,
    _id: row.id,
    label: row.label,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    spendingLimit: row.spendingLimit,
  }
}

function mapTransaction(row: TransactionRow): LocalTransaction {
  return {
    id: row.id,
    _id: row.id,
    cycleUuid: row.cycleUuid,
    type: row.type,
    amount: row.amount,
    payee: row.payee,
    categoryId: nullToUndefined(row.categoryId),
    accountId: row.accountUuid,
    accountUuid: row.accountUuid,
    toAccountId: nullToUndefined(row.toAccountUuid),
    toAccountUuid: nullToUndefined(row.toAccountUuid),
    walletId: row.walletId,
    items: nullToUndefined(row.items),
    note: nullToUndefined(row.note),
    adjustment: optionalBool(row.adjustment),
    autoSave: optionalBool(row.autoSave),
    excludeFromBudget: asBool(row.excludeFromBudget),
    sourceId: nullToUndefined(row.sourceUuid),
    sourceUuid: nullToUndefined(row.sourceUuid),
    occurredAt: row.occurredAt,
  }
}

function mapBudget(row: BudgetRow): LocalBudget {
  return {
    id: row.id,
    _id: row.id,
    cycleUuid: row.cycleUuid,
    categoryId: row.categoryId,
    plannedAmount: row.plannedAmount,
  }
}

function mapIncomeSource(row: IncomeSourceRow): LocalIncomeSource {
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    expectedDayStart: row.expectedDayStart,
    expectedDayEnd: row.expectedDayEnd,
    expectedAmount: row.expectedAmount,
    expectedAmountMax: nullToUndefined(row.expectedAmountMax),
    savingsRate: row.savingsRate,
    isAnchor: asBool(row.isAnchor),
    sortOrder: row.sortOrder,
    archivedAt: nullToUndefined(row.archivedAt),
  }
}

function mapCycleIncomePlan(row: CycleIncomePlanRow): LocalCycleIncomePlan {
  return {
    id: row.id,
    _id: row.id,
    cycleUuid: row.cycleUuid,
    sourceId: row.sourceUuid,
    sourceUuid: row.sourceUuid,
    sourceName: row.sourceName,
    expectedDayStart: row.expectedDayStart,
    expectedDayEnd: row.expectedDayEnd,
    expectedAmount: row.expectedAmount,
    expectedAmountMax: nullToUndefined(row.expectedAmountMax),
    savingsRate: row.savingsRate,
    isAnchor: asBool(row.isAnchor),
  }
}

function mapDebt(row: DebtRow): LocalDebt {
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    balance: row.balance,
  }
}

function mapSettings(row: SettingsRow): LocalSettings {
  const autoSaveSourceAccountUuid = nullToUndefined(
    row.autoSaveSourceAccountUuid,
  )
  const defaultExpenseAccountUuid = nullToUndefined(
    row.defaultExpenseAccountUuid,
  )
  const defaultTransferFromAccountUuid = nullToUndefined(
    row.defaultTransferFromAccountUuid,
  )
  const defaultTransferToAccountUuid = nullToUndefined(
    row.defaultTransferToAccountUuid,
  )
  return {
    id: row.id,
    _id: row.id,
    usdRate: row.usdRate,
    defaultSavingsRate: row.defaultSavingsRate,
    autoSaveSourceAccountUuid,
    autoSaveSourceAccountId: autoSaveSourceAccountUuid,
    defaultExpenseAccountUuid,
    defaultExpenseAccountId: defaultExpenseAccountUuid,
    defaultTransferFromAccountUuid,
    defaultTransferFromAccountId: defaultTransferFromAccountUuid,
    defaultTransferToAccountUuid,
    defaultTransferToAccountId: defaultTransferToAccountUuid,
    savingsOpeningBalance: row.savingsOpeningBalance,
    paydayDay: nullToUndefined(row.paydayDay),
    onboardedAt: nullToUndefined(row.onboardedAt),
  }
}

/** Ports `getLatestCycle` from convex/misi.ts. */
function selectCurrentCycle(cycles: CycleRow[], now = Date.now()): CycleRow | null {
  const covering = cycles.find(
    (cycle) => cycle.startsAt <= now && now <= cycle.endsAt,
  )
  if (covering) return covering
  return (
    cycles
      .filter((cycle) => cycle.startsAt <= now)
      .sort((a, b) => b.startsAt - a.startsAt)
      .at(0) ?? null
  )
}

/**
 * Ports `api.misi.bootstrap` / `loadBootstrapData` from convex/misi.ts.
 * Returns `data: null` when there is no current cycle (same as the Convex query).
 */
export function useLocalBootstrap(): {
  isLoading: boolean
  data: LocalBootstrapData | null
} {
  const settingsQuery = useQuery<SettingsRow>('SELECT * FROM settings LIMIT 1')
  const accountsQuery = useQuery<AccountRow>(
    'SELECT * FROM accounts ORDER BY sortOrder ASC',
  )
  const cyclesQuery = useQuery<CycleRow>('SELECT * FROM cycles')
  const transactionsQuery = useQuery<TransactionRow>('SELECT * FROM transactions')
  const budgetsQuery = useQuery<BudgetRow>('SELECT * FROM budgets')
  const cycleIncomePlansQuery = useQuery<CycleIncomePlanRow>(
    'SELECT * FROM cycleIncomePlans',
  )
  const incomeSourcesQuery = useQuery<IncomeSourceRow>(
    'SELECT * FROM incomeSources',
  )
  const debtsQuery = useQuery<DebtRow>('SELECT * FROM debts')
  const categoriesQuery = useQuery<CategoryRow>(
    'SELECT * FROM categories ORDER BY sortOrder ASC',
  )
  const autoSaveEventsQuery = useQuery<AutoSaveEventRow>(
    'SELECT * FROM autoSaveEvents',
  )

  const isLoading =
    settingsQuery.isLoading ||
    accountsQuery.isLoading ||
    cyclesQuery.isLoading ||
    transactionsQuery.isLoading ||
    budgetsQuery.isLoading ||
    cycleIncomePlansQuery.isLoading ||
    incomeSourcesQuery.isLoading ||
    debtsQuery.isLoading ||
    categoriesQuery.isLoading ||
    autoSaveEventsQuery.isLoading

  const data = useMemo(() => {
    if (isLoading) return null

    const currentCycleRow = selectCurrentCycle(cyclesQuery.data)
    if (!currentCycleRow) return null

    const settingsRow = settingsQuery.data.at(0) ?? null
    const settings = settingsRow ? mapSettings(settingsRow) : null
    const accounts = [...accountsQuery.data]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapAccount)
    const currentCycle = mapCycle(currentCycleRow)
    const incomeSources = incomeSourcesQuery.data
      .filter((source) => source.archivedAt == null)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapIncomeSource)
    const debts = debtsQuery.data.map(mapDebt)
    const categories = [...categoriesQuery.data]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapCategory)

    const transactions = transactionsQuery.data
      .filter((transaction) => transaction.cycleUuid === currentCycleRow.id)
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .map(mapTransaction)
    const budgets = budgetsQuery.data
      .filter((budget) => budget.cycleUuid === currentCycleRow.id)
      .map(mapBudget)
    const cycleIncomePlans = cycleIncomePlansQuery.data
      .filter((plan) => plan.cycleUuid === currentCycleRow.id)
      .map(mapCycleIncomePlan)

    const savingsTransfersTotal = transactionsQuery.data
      .filter((transaction) => transaction.walletId === 'savings')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    const savingsBalance = settings
      ? settings.savingsOpeningBalance + savingsTransfersTotal
      : null

    let pendingAutoSave: LocalPendingAutoSave | null = null
    if (settings) {
      const handledTransactionIds = new Set(
        autoSaveEventsQuery.data.map((event) => event.transactionUuid),
      )
      const unhandledIncome = transactions.filter(
        (transaction) =>
          transaction.type === 'income' &&
          !handledTransactionIds.has(transaction.id),
      )

      for (const pendingIncome of unhandledIncome) {
        const linkedSource = pendingIncome.sourceId
          ? incomeSources.find((source) => source.id === pendingIncome.sourceId)
          : undefined
        const cyclePlan = pendingIncome.sourceId
          ? cycleIncomePlans.find(
              (plan) => plan.sourceId === pendingIncome.sourceId,
            )
          : undefined
        const savingsRate =
          cyclePlan?.savingsRate ??
          linkedSource?.savingsRate ??
          settings.defaultSavingsRate
        const amount = Math.round(pendingIncome.amount * savingsRate)
        if (amount <= 0) continue
        pendingAutoSave = {
          transactionId: pendingIncome.id,
          amount,
          sourceName:
            cyclePlan?.sourceName ??
            linkedSource?.name ??
            pendingIncome.payee,
          sourceId: pendingIncome.sourceId,
          savingsRate,
          occurredAt: pendingIncome.occurredAt,
        }
        break
      }
    }

    return {
      settings,
      accounts,
      currentCycle,
      transactions,
      budgets,
      cycleIncomePlans,
      incomeSources,
      debts,
      categories,
      savingsBalance,
      pendingAutoSave,
    } satisfies LocalBootstrapData
  }, [
    isLoading,
    settingsQuery.data,
    accountsQuery.data,
    cyclesQuery.data,
    transactionsQuery.data,
    budgetsQuery.data,
    cycleIncomePlansQuery.data,
    incomeSourcesQuery.data,
    debtsQuery.data,
    categoriesQuery.data,
    autoSaveEventsQuery.data,
  ])

  return { isLoading, data }
}

/**
 * Ports `api.misi.budgetOverview` from convex/misi.ts.
 */
export function useLocalBudgetOverview(): {
  isLoading: boolean
  data: LocalBudgetOverview
} {
  const cyclesQuery = useQuery<CycleRow>('SELECT * FROM cycles')
  const categoriesQuery = useQuery<CategoryRow>(
    'SELECT * FROM categories ORDER BY sortOrder ASC',
  )
  const budgetsQuery = useQuery<BudgetRow>('SELECT * FROM budgets')
  const plansQuery = useQuery<CycleIncomePlanRow>(
    'SELECT * FROM cycleIncomePlans',
  )
  const transactionsQuery = useQuery<TransactionRow>('SELECT * FROM transactions')

  const isLoading =
    cyclesQuery.isLoading ||
    categoriesQuery.isLoading ||
    budgetsQuery.isLoading ||
    plansQuery.isLoading ||
    transactionsQuery.isLoading

  const data = useMemo(() => {
    const categories = [...categoriesQuery.data]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapCategory)
    const cycles = [...cyclesQuery.data].sort((a, b) => b.startsAt - a.startsAt)

    const cycleViews = cycles.map((cycleRow) => {
      const cycle = mapCycle(cycleRow)
      const budgets = budgetsQuery.data.filter(
        (budget) => budget.cycleUuid === cycleRow.id,
      )
      const plans = plansQuery.data
        .filter((plan) => plan.cycleUuid === cycleRow.id)
        .map(mapCycleIncomePlan)
      const transactions = transactionsQuery.data.filter(
        (transaction) => transaction.cycleUuid === cycleRow.id,
      )

      const plannedByCategory = new Map(
        budgets.map((budget) => [budget.categoryId, budget.plannedAmount]),
      )
      const actualByCategory = new Map<string, number>()
      for (const transaction of transactions) {
        if (
          transaction.type !== 'expense' ||
          asBool(transaction.excludeFromBudget) ||
          !transaction.categoryId
        ) {
          continue
        }
        actualByCategory.set(
          transaction.categoryId,
          (actualByCategory.get(transaction.categoryId) ?? 0) +
            transaction.amount,
        )
      }

      const categoryRows = categories
        .filter((category) => !category.isSystem)
        .map((category) => {
          const plannedAmount = plannedByCategory.get(category.key) ?? 0
          const actualAmount = actualByCategory.get(category.key) ?? 0
          return {
            categoryId: category.key,
            categoryName: category.name,
            budgetGroup: category.budgetGroup,
            plannedAmount,
            actualAmount,
            variance: plannedAmount - actualAmount,
          }
        })

      const actualIncomeBySource = new Map<string, number>()
      for (const transaction of transactions) {
        if (transaction.type !== 'income' || !transaction.sourceUuid) continue
        actualIncomeBySource.set(
          transaction.sourceUuid,
          (actualIncomeBySource.get(transaction.sourceUuid) ?? 0) +
            transaction.amount,
        )
      }
      const incomePlanRows = plans.map((plan) => {
        const actualAmount = actualIncomeBySource.get(plan.sourceId) ?? 0
        return {
          sourceId: plan.sourceId,
          sourceName: plan.sourceName,
          expectedDayStart: plan.expectedDayStart,
          expectedDayEnd: plan.expectedDayEnd,
          expectedAmount: plan.expectedAmount,
          expectedAmountMax: plan.expectedAmountMax,
          savingsRate: plan.savingsRate,
          isAnchor: plan.isAnchor,
          actualAmount,
          variance: actualAmount - plan.expectedAmount,
        }
      })

      const totalPlanned = budgets.reduce(
        (sum, budget) => sum + budget.plannedAmount,
        0,
      )
      const actualIncome = transactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0)
      const actualSpending = transactions
        .filter(
          (transaction) =>
            transaction.type === 'expense' &&
            !asBool(transaction.excludeFromBudget),
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0)
      const actualSavings = transactions
        .filter((transaction) => transaction.walletId === 'savings')
        .reduce((sum, transaction) => sum + transaction.amount, 0)
      const plannedIncome = incomePlanRows.reduce(
        (sum, plan) => sum + plan.expectedAmount,
        0,
      )
      const savingsTarget = incomePlanRows.reduce(
        (sum, plan) => sum + plan.expectedAmount * plan.savingsRate,
        0,
      )

      return {
        cycle,
        spendingLimit: cycle.spendingLimit,
        totalPlanned,
        allocatedAmount: totalPlanned,
        unallocatedAmount: cycle.spendingLimit - totalPlanned,
        plannedIncome,
        actualIncome,
        actualSpending,
        actualSavings,
        savingsTarget,
        savingsVariance: actualSavings - savingsTarget,
        spendingVariance: cycle.spendingLimit - actualSpending,
        remainingAmount: cycle.spendingLimit - actualSpending,
        cashSurplusOrDeficit: actualIncome - actualSpending - actualSavings,
        categoryRows,
        incomePlans: incomePlanRows,
      } satisfies LocalBudgetCycleView
    })

    return { cycles: cycleViews } satisfies LocalBudgetOverview
  }, [
    cyclesQuery.data,
    categoriesQuery.data,
    budgetsQuery.data,
    plansQuery.data,
    transactionsQuery.data,
  ])

  return { isLoading, data }
}

/**
 * Ports `api.misi.listCategories` / `getCategoriesWithReferences` from convex/misi.ts.
 */
export function useLocalCategories(): {
  isLoading: boolean
  data: LocalCategoryWithReference[]
} {
  const categoriesQuery = useQuery<CategoryRow>(
    'SELECT * FROM categories ORDER BY sortOrder ASC',
  )
  const referencedQuery = useQuery<{ categoryId: string }>(
    `SELECT DISTINCT categoryId FROM (
      SELECT categoryId FROM transactions WHERE categoryId IS NOT NULL
      UNION
      SELECT categoryId FROM budgets
    )`,
  )

  const isLoading = categoriesQuery.isLoading || referencedQuery.isLoading

  const data = useMemo(() => {
    const referencedKeys = new Set(
      referencedQuery.data.map((row) => row.categoryId),
    )
    return [...categoriesQuery.data]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => ({
        ...mapCategory(row),
        referenced: referencedKeys.has(row.key),
      }))
  }, [categoriesQuery.data, referencedQuery.data])

  return { isLoading, data }
}
