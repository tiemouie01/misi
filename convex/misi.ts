import { v } from 'convex/values'

import {
  collectBudgetableSeeds,
  seedCycleBudgetsFromPrevious,
  spentByCategory,
  totalBudgetSpending,
} from '../shared/budget-rollover'
import { accountBalanceImpacts, assertUsdRate, roundMoney } from '../shared/fx'
import { mutation, query } from './_generated/server'
import { requireAuthUser } from './auth'
import {
  CATEGORY_COLOR_IDS,
  CATEGORY_ICON_IDS,
  DEFAULT_CATEGORIES,
} from './categories'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

const userTransactionType = v.union(
  v.literal('expense'),
  v.literal('income'),
  v.literal('transfer'),
)

const transactionType = v.union(
  v.literal('expense'),
  v.literal('income'),
  v.literal('transfer'),
  v.literal('allocation'),
)

const allocationDirection = v.union(
  v.literal('toSavings'),
  v.literal('toSpending'),
)

const monthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

type ReadCtx = QueryCtx | MutationCtx

type TransactionInput = {
  type: Doc<'transactions'>['type']
  amount: number
  categoryId?: string
  accountId?: Id<'accounts'>
  toAccountId?: Id<'accounts'>
  sourceId?: Id<'incomeSources'>
  excludeFromBudget?: boolean
  fxRate?: number
}

async function getCategories(ctx: ReadCtx, userId: string) {
  const categories = await ctx.db
    .query('categories')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  return categories.sort((a, b) => a.sortOrder - b.sortOrder)
}

async function isCategoryReferenced(
  ctx: ReadCtx,
  userId: string,
  categoryKey: string,
) {
  const [transaction, budget] = await Promise.all([
    ctx.db
      .query('transactions')
      .withIndex('by_user_and_category', (q) =>
        q.eq('userId', userId).eq('categoryId', categoryKey),
      )
      .first(),
    ctx.db
      .query('budgets')
      .withIndex('by_user_and_category', (q) =>
        q.eq('userId', userId).eq('categoryId', categoryKey),
      )
      .first(),
  ])
  return transaction !== null || budget !== null
}

async function getCategoriesWithReferences(ctx: ReadCtx, userId: string) {
  const categories = await getCategories(ctx, userId)
  return await Promise.all(
    categories.map(async (category) => ({
      ...category,
      referenced: await isCategoryReferenced(ctx, userId, category.key),
    })),
  )
}

async function seedDefaultCategoriesForUser(ctx: MutationCtx, userId: string) {
  const existing = await ctx.db
    .query('categories')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
  if (existing) return false

  for (const [sortOrder, category] of DEFAULT_CATEGORIES.entries()) {
    await ctx.db.insert('categories', {
      userId,
      ...category,
      sortOrder,
    })
  }
  return true
}

function validateCategoryName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Category name cannot be empty')
  return trimmed
}

function validateCategoryIcon(icon: string) {
  if (!(CATEGORY_ICON_IDS as readonly string[]).includes(icon)) {
    throw new Error('Choose a valid category icon')
  }
}

function validateCategoryColor(color: string) {
  if (!(CATEGORY_COLOR_IDS as readonly string[]).includes(color)) {
    throw new Error('Choose a valid category color')
  }
}

async function assertUniqueCategoryName(
  ctx: ReadCtx,
  userId: string,
  name: string,
  excludeId?: Id<'categories'>,
) {
  const categories = await getCategories(ctx, userId)
  const duplicate = categories.some(
    (category) =>
      category._id !== excludeId &&
      category.archivedAt === undefined &&
      category.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw new Error('A category with this name already exists')
}

async function requireOwnedCategory(
  ctx: ReadCtx,
  userId: string,
  id: Id<'categories'>,
) {
  const category = await ctx.db.get(id)
  if (!category || category.userId !== userId) {
    throw new Error('Category not found')
  }
  return category
}

function assertPositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number')
  }
}

const DEFAULT_PAYDAY_DAY = 20
const BLANTYRE_UTC_OFFSET_MS = 2 * 60 * 60 * 1000

function getCyclePeriod(now: number, paydayDay = DEFAULT_PAYDAY_DAY) {
  const today = new Date(now + BLANTYRE_UTC_OFFSET_MS)
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()
  const day = today.getUTCDate()
  const startMonth = day >= paydayDay ? month : month - 1
  const startsAt =
    Date.UTC(year, startMonth, paydayDay) - BLANTYRE_UTC_OFFSET_MS
  const endsAt =
    Date.UTC(year, startMonth + 1, paydayDay) - BLANTYRE_UTC_OFFSET_MS - 1
  const startDate = new Date(startsAt + BLANTYRE_UTC_OFFSET_MS)

  return {
    label: `${monthLabels[startDate.getUTCMonth()]} cycle`,
    startsAt,
    endsAt,
  }
}

async function getLatestCycle(ctx: ReadCtx, userId: string) {
  const cycles = await ctx.db
    .query('cycles')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  const now = Date.now()
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

async function getCycleIncomePlans(
  ctx: ReadCtx,
  userId: string,
  cycleId: Id<'cycles'>,
) {
  return await ctx.db
    .query('cycleIncomePlans')
    .withIndex('by_user_and_cycle', (q) =>
      q.eq('userId', userId).eq('cycleId', cycleId),
    )
    .collect()
}

async function getSettings(ctx: ReadCtx, userId: string) {
  return await ctx.db
    .query('settings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
}

async function syncCycleIncomePlans(
  ctx: MutationCtx,
  userId: string,
  cycleId: Id<'cycles'>,
) {
  const [existingPlans, allIncomeSources] = await Promise.all([
    getCycleIncomePlans(ctx, userId, cycleId),
    ctx.db
      .query('incomeSources')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  ])
  const incomeSources = allIncomeSources.filter(
    (source) => source.archivedAt === undefined,
  )
  const existingSourceIds = new Set(existingPlans.map((plan) => plan.sourceId))
  for (const source of incomeSources) {
    if (existingSourceIds.has(source._id)) continue
    await ctx.db.insert('cycleIncomePlans', {
      userId,
      cycleId,
      sourceId: source._id,
      sourceName: source.name,
      expectedDayStart: source.expectedDayStart,
      expectedDayEnd: source.expectedDayEnd,
      expectedAmount: source.expectedAmount,
      expectedAmountMax: source.expectedAmountMax,
      savingsRate: source.savingsRate,
      isAnchor: source.isAnchor,
    })
  }
}

async function copyCyclePlans(
  ctx: MutationCtx,
  userId: string,
  fromCycleId: Id<'cycles'>,
  toCycleId: Id<'cycles'>,
) {
  const [
    previousBudgets,
    previousIncomePlans,
    previousTransactions,
    categories,
    previousCycle,
  ] = await Promise.all([
    ctx.db
      .query('budgets')
      .withIndex('by_user_and_cycle', (q) =>
        q.eq('userId', userId).eq('cycleId', fromCycleId),
      )
      .collect(),
    getCycleIncomePlans(ctx, userId, fromCycleId),
    ctx.db
      .query('transactions')
      .withIndex('by_user_and_cycle', (q) =>
        q.eq('userId', userId).eq('cycleId', fromCycleId),
      )
      .collect(),
    getCategories(ctx, userId),
    ctx.db.get(fromCycleId),
  ])

  const seededInput = collectBudgetableSeeds({
    categories: categories.map((category) => ({
      key: category.key,
      isSystem: category.isSystem,
      archived: category.archivedAt !== undefined,
    })),
    previousBudgets,
    spentByCategory: spentByCategory(previousTransactions),
  })
  const seeded = seedCycleBudgetsFromPrevious({
    ...seededInput,
    previousSpendingLimit: previousCycle?.spendingLimit ?? 0,
  })

  for (const plan of seeded.categoryPlans) {
    await ctx.db.insert('budgets', {
      userId,
      cycleId: toCycleId,
      categoryId: plan.categoryId,
      plannedAmount: plan.plannedAmount,
    })
  }
  await ctx.db.patch(toCycleId, { spendingLimit: seeded.spendingLimit })

  for (const plan of previousIncomePlans) {
    const source = await ctx.db.get(plan.sourceId)
    if (
      !source ||
      source.userId !== userId ||
      source.archivedAt !== undefined
    ) {
      continue
    }
    await ctx.db.insert('cycleIncomePlans', {
      userId,
      cycleId: toCycleId,
      sourceId: plan.sourceId,
      sourceName: source.name,
      expectedDayStart: source.expectedDayStart,
      expectedDayEnd: source.expectedDayEnd,
      expectedAmount: plan.expectedAmount,
      expectedAmountMax: plan.expectedAmountMax,
      savingsRate: plan.savingsRate,
      isAnchor: source.isAnchor,
    })
  }
}

async function ensureCycleForDate(
  ctx: MutationCtx,
  userId: string,
  occurredAt: number,
) {
  if (!Number.isFinite(occurredAt)) {
    throw new Error('Transaction date must be a finite number')
  }
  const settings = await getSettings(ctx, userId)
  const period = getCyclePeriod(
    occurredAt,
    settings?.paydayDay ?? DEFAULT_PAYDAY_DAY,
  )
  const cycles = await ctx.db
    .query('cycles')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()

  const matchingPeriod = cycles.find(
    (cycle) => cycle.startsAt === period.startsAt,
  )
  if (matchingPeriod) {
    return matchingPeriod
  }

  const covering = cycles.find(
    (cycle) => cycle.startsAt <= occurredAt && occurredAt <= cycle.endsAt,
  )
  if (covering) {
    return covering
  }

  const previousCycle =
    cycles
      .filter((cycle) => cycle.startsAt < period.startsAt)
      .sort((a, b) => b.startsAt - a.startsAt)
      .at(0) ?? null
  const cycleId = await ctx.db.insert('cycles', {
    userId,
    ...period,
    spendingLimit: previousCycle?.spendingLimit ?? 0,
  })

  if (previousCycle) {
    await copyCyclePlans(ctx, userId, previousCycle._id, cycleId)
  }

  const cycle = await ctx.db.get(cycleId)

  if (!cycle) {
    throw new Error('Failed to create cycle')
  }

  await syncCycleIncomePlans(ctx, userId, cycle._id)
  return cycle
}

async function ensureCurrentCycle(ctx: MutationCtx, userId: string) {
  return await ensureCycleForDate(ctx, userId, Date.now())
}

async function requireSettings(ctx: ReadCtx, userId: string) {
  const settings = await getSettings(ctx, userId)

  if (!settings) {
    throw new Error('Settings not found; run ensureSeedData first')
  }

  return settings
}

async function requireOwnedAccount(
  ctx: ReadCtx,
  userId: string,
  accountId: Id<'accounts'>,
) {
  const account = await ctx.db.get(accountId)

  if (!account || account.userId !== userId) {
    throw new Error('Account not found')
  }

  return account
}

function isSpendableAccount(account: Doc<'accounts'>) {
  return account.includeInSpendable ?? account.kind !== 'investment'
}

function computeSpendableTotalMwk(
  accounts: Array<Doc<'accounts'>>,
  usdRate: number,
) {
  return accounts.reduce((total, account) => {
    if (!isSpendableAccount(account)) return total
    return (
      total +
      (account.currency === 'USD' ? account.balance * usdRate : account.balance)
    )
  }, 0)
}

function savingsEnvelopeContribution(transaction: Doc<'transactions'>) {
  if (transaction.type === 'allocation') {
    if (transaction.direction === 'toSavings') return transaction.amount
    if (transaction.direction === 'toSpending') return -transaction.amount
    return 0
  }
  if (transaction.type === 'transfer' || transaction.type === 'expense') {
    return -transaction.amount
  }
  return 0
}

async function computeSavingsBalance(
  ctx: ReadCtx,
  userId: string,
  settings: Doc<'settings'>,
  excludeTransactionId?: Id<'transactions'>,
) {
  const savingsTransactions = await ctx.db
    .query('transactions')
    .withIndex('by_user_and_wallet', (q) =>
      q.eq('userId', userId).eq('walletId', 'savings'),
    )
    .collect()
  return savingsTransactions.reduce((sum, transaction) => {
    if (transaction._id === excludeTransactionId) return sum
    return sum + savingsEnvelopeContribution(transaction)
  }, settings.savingsOpeningBalance)
}

function assertFromSavingsType(
  type: Doc<'transactions'>['type'],
  fromSavings?: boolean,
) {
  if (!fromSavings) return
  if (type !== 'expense' && type !== 'transfer') {
    throw new Error('Savings spending is only valid for expenses and transfers')
  }
}

async function assertSavingsHasAmount(
  ctx: ReadCtx,
  userId: string,
  amount: number,
  excludeTransactionId?: Id<'transactions'>,
) {
  const settings = await requireSettings(ctx, userId)
  const savingsBalance = await computeSavingsBalance(
    ctx,
    userId,
    settings,
    excludeTransactionId,
  )
  if (amount > savingsBalance) {
    throw new Error('Not enough in savings')
  }
}

function resolveEnvelopeFields(
  type: Doc<'transactions'>['type'],
  fromSavings: boolean | undefined,
  excludeFromBudget: boolean | undefined,
) {
  assertFromSavingsType(type, fromSavings)
  return {
    walletId: fromSavings ? 'savings' : 'spending',
    excludeFromBudget:
      fromSavings && type === 'expense' ? true : (excludeFromBudget ?? false),
  }
}

async function requireOwnedTransaction(
  ctx: ReadCtx,
  userId: string,
  transactionId: Id<'transactions'>,
) {
  const transaction = await ctx.db.get(transactionId)

  if (!transaction || transaction.userId !== userId) {
    throw new Error('Transaction not found')
  }

  return transaction
}

async function assertMutableUserTransaction(
  ctx: ReadCtx,
  transaction: Doc<'transactions'>,
  action: 'edited' | 'deleted',
) {
  if (transaction.adjustment) {
    throw new Error(`Generated transactions cannot be ${action}`)
  }
  if (transaction.type === 'allocation') {
    throw new Error(`Generated transactions cannot be ${action}`)
  }

  if (transaction.type !== 'income') return

  const autoSaveEvent = await ctx.db
    .query('autoSaveEvents')
    .withIndex('by_transaction', (q) => q.eq('transactionId', transaction._id))
    .first()
  if (autoSaveEvent) {
    throw new Error(
      `Income with a handled savings proposal cannot be ${action}`,
    )
  }
}

async function requireOwnedCycle(
  ctx: ReadCtx,
  userId: string,
  cycleId: Id<'cycles'>,
) {
  const cycle = await ctx.db.get(cycleId)
  if (!cycle || cycle.userId !== userId) {
    throw new Error('Cycle not found')
  }
  return cycle
}

async function validateTransactionInput(
  ctx: ReadCtx,
  userId: string,
  input: TransactionInput,
) {
  assertPositiveAmount(input.amount)

  if (input.type === 'allocation') {
    if (input.accountId) {
      throw new Error('Allocations cannot be tied to an account')
    }
    if (input.toAccountId) {
      throw new Error('A destination account is only valid for transfers')
    }
    if (input.categoryId) {
      throw new Error('A category is only valid for expenses')
    }
    if (input.sourceId) {
      throw new Error('sourceId is only valid for income transactions')
    }
    return
  }

  if (!input.accountId) {
    throw new Error('An account is required')
  }
  await requireOwnedAccount(ctx, userId, input.accountId)

  if (input.type === 'expense') {
    if (!input.categoryId) {
      throw new Error('A category is required for expenses')
    }
    const category = (await getCategories(ctx, userId)).find(
      (candidate) => candidate.key === input.categoryId,
    )
    if (!category || category.archivedAt !== undefined) {
      throw new Error('Expense category not found')
    }
  } else if (input.categoryId) {
    throw new Error('A category is only valid for expenses')
  }

  if (input.excludeFromBudget && input.type !== 'expense') {
    throw new Error('Only expenses can be excluded from the spending plan')
  }

  if (input.sourceId) {
    if (input.type !== 'income') {
      throw new Error('sourceId is only valid for income transactions')
    }
    const source = await ctx.db.get(input.sourceId)
    if (
      !source ||
      source.userId !== userId ||
      source.archivedAt !== undefined
    ) {
      throw new Error('Income source not found')
    }
  }

  if (input.type === 'transfer') {
    if (!input.toAccountId) {
      throw new Error('A destination account is required for transfers')
    }
    if (input.toAccountId === input.accountId) {
      throw new Error('Transfer accounts must be different')
    }
    await requireOwnedAccount(ctx, userId, input.toAccountId)
  } else if (input.toAccountId) {
    throw new Error('A destination account is only valid for transfers')
  }
}

async function loadAccountCurrencies(
  ctx: MutationCtx,
  userId: string,
  input: TransactionInput | null,
  currencyByAccountId: Map<string, Doc<'accounts'>['currency']>,
) {
  if (!input) return
  for (const accountId of [input.accountId, input.toAccountId]) {
    if (!accountId || currencyByAccountId.has(accountId)) continue
    const account = await requireOwnedAccount(ctx, userId, accountId)
    currencyByAccountId.set(account._id, account.currency)
  }
}

async function withCapturedFxRate(
  ctx: ReadCtx,
  userId: string,
  input: TransactionInput,
): Promise<TransactionInput> {
  if (input.fxRate !== undefined) {
    assertUsdRate(input.fxRate)
    return input
  }

  for (const accountId of [input.accountId, input.toAccountId]) {
    if (!accountId) continue
    const account = await requireOwnedAccount(ctx, userId, accountId)
    if (account.currency === 'USD') {
      const settings = await requireSettings(ctx, userId)
      assertUsdRate(settings.usdRate)
      return { ...input, fxRate: settings.usdRate }
    }
  }

  return input
}

function getAccountBalanceImpacts(
  input: TransactionInput,
  currencyByAccountId: Map<string, Doc<'accounts'>['currency']>,
) {
  const impacts = accountBalanceImpacts({
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    toAccountId: input.toAccountId,
    currencyByAccountId,
    usdRate: input.fxRate,
  })
  const typed = new Map<Id<'accounts'>, number>()
  for (const [accountId, amount] of impacts) {
    typed.set(accountId as Id<'accounts'>, amount)
  }
  return typed
}

async function applyTransactionBalanceTransition(
  ctx: MutationCtx,
  userId: string,
  previous: TransactionInput | null,
  next: TransactionInput | null,
) {
  const currencyByAccountId = new Map<string, Doc<'accounts'>['currency']>()
  await loadAccountCurrencies(ctx, userId, previous, currencyByAccountId)
  const nextInput = next ? await withCapturedFxRate(ctx, userId, next) : null
  await loadAccountCurrencies(ctx, userId, nextInput, currencyByAccountId)

  if (previous && previous.fxRate === undefined) {
    const previousTouchesUsd = [previous.accountId, previous.toAccountId].some(
      (accountId) =>
        accountId !== undefined && currencyByAccountId.get(accountId) === 'USD',
    )
    if (previousTouchesUsd) {
      throw new Error(
        'This USD transfer is missing a stored exchange rate. Run the FX repair before editing or deleting it.',
      )
    }
  }

  const changes = new Map<Id<'accounts'>, number>()
  const addChange = (accountId: Id<'accounts'>, amount: number) => {
    changes.set(accountId, (changes.get(accountId) ?? 0) + amount)
  }

  if (previous) {
    for (const [accountId, amount] of getAccountBalanceImpacts(
      previous,
      currencyByAccountId,
    )) {
      addChange(accountId, -amount)
    }
  }
  if (nextInput) {
    for (const [accountId, amount] of getAccountBalanceImpacts(
      nextInput,
      currencyByAccountId,
    )) {
      addChange(accountId, amount)
    }
  }

  for (const [accountId, change] of changes) {
    if (change === 0) continue
    const account = await requireOwnedAccount(ctx, userId, accountId)
    await ctx.db.patch(account._id, {
      balance: roundMoney(account.balance + change),
    })
  }
}

async function requireOwnedIncomeTransaction(
  ctx: ReadCtx,
  userId: string,
  transactionId: Id<'transactions'>,
) {
  const transaction = await ctx.db.get(transactionId)

  if (
    !transaction ||
    transaction.userId !== userId ||
    transaction.type !== 'income'
  ) {
    throw new Error('Income transaction not found')
  }

  return transaction
}

async function assertNoAutoSaveEvent(
  ctx: ReadCtx,
  transactionId: Id<'transactions'>,
) {
  const existing = await ctx.db
    .query('autoSaveEvents')
    .withIndex('by_transaction', (q) => q.eq('transactionId', transactionId))
    .first()

  if (existing) {
    throw new Error('Auto-save proposal has already been handled')
  }
}

async function seedData(ctx: MutationCtx, userId: string) {
  const existingAccount = await ctx.db
    .query('accounts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()

  if (existingAccount) {
    return false
  }

  const nbsAccountId = await ctx.db.insert('accounts', {
    userId,
    name: 'NBS Bank',
    kind: 'bank',
    currency: 'MWK',
    balance: 842100,
    sortOrder: 0,
  })
  await ctx.db.insert('accounts', {
    userId,
    name: 'FDH Bank',
    kind: 'bank',
    currency: 'MWK',
    balance: 210450,
    sortOrder: 1,
  })
  const airtelAccountId = await ctx.db.insert('accounts', {
    userId,
    name: 'Airtel Money',
    kind: 'mobile',
    currency: 'MWK',
    balance: 96300,
    sortOrder: 2,
  })
  const cashAccountId = await ctx.db.insert('accounts', {
    userId,
    name: 'Cash',
    kind: 'cash',
    currency: 'MWK',
    balance: 38500,
    sortOrder: 3,
  })
  await ctx.db.insert('accounts', {
    userId,
    name: 'Unit Trust',
    kind: 'investment',
    currency: 'MWK',
    balance: 1412000,
    sortOrder: 4,
  })
  await ctx.db.insert('accounts', {
    userId,
    name: 'USD Account',
    kind: 'investment',
    currency: 'USD',
    balance: 420,
    sortOrder: 5,
  })

  const period = getCyclePeriod(Date.now())
  const cycleId = await ctx.db.insert('cycles', {
    userId,
    ...period,
    spendingLimit: 650000,
  })

  const budgets = [
    ['groceries', 220000],
    ['transport', 90000],
    ['eating-out', 60000],
    ['airtime', 30000],
    ['utilities', 80000],
  ] as const

  for (const [categoryId, plannedAmount] of budgets) {
    await ctx.db.insert('budgets', {
      userId,
      cycleId,
      categoryId,
      plannedAmount,
    })
  }

  const incomeSources = [
    {
      name: 'Salary',
      expectedDayStart: 20,
      expectedDayEnd: 20,
      expectedAmount: 1850000,
      savingsRate: 0.2,
      isAnchor: true,
    },
    {
      name: 'Allowance',
      expectedDayStart: 10,
      expectedDayEnd: 10,
      expectedAmount: 150000,
      savingsRate: 0.5,
      isAnchor: false,
    },
    {
      name: 'Secondary income',
      expectedDayStart: 24,
      expectedDayEnd: 30,
      expectedAmount: 300000,
      expectedAmountMax: 450000,
      savingsRate: 0.2,
      isAnchor: false,
    },
  ] as const

  for (const [sortOrder, source] of incomeSources.entries()) {
    const sourceId = await ctx.db.insert('incomeSources', {
      userId,
      ...source,
      sortOrder,
    })
    await ctx.db.insert('cycleIncomePlans', {
      userId,
      cycleId,
      sourceId,
      sourceName: source.name,
      expectedDayStart: source.expectedDayStart,
      expectedDayEnd: source.expectedDayEnd,
      expectedAmount: source.expectedAmount,
      expectedAmountMax:
        'expectedAmountMax' in source ? source.expectedAmountMax : undefined,
      savingsRate: source.savingsRate,
      isAnchor: source.isAnchor,
    })
  }

  await ctx.db.insert('debts', {
    userId,
    name: 'Chisomo',
    balance: 50000,
  })
  await ctx.db.insert('settings', {
    userId,
    usdRate: 1735,
    defaultSavingsRate: 0.2,
    autoSaveSourceAccountId: nbsAccountId,
    defaultExpenseAccountId: airtelAccountId,
    defaultTransferFromAccountId: nbsAccountId,
    defaultTransferToAccountId: cashAccountId,
    savingsOpeningBalance: 315000,
  })

  return true
}

async function loadBootstrapData(ctx: ReadCtx, userId: string) {
  const settings = await getSettings(ctx, userId)
  const accounts = await ctx.db
    .query('accounts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  const currentCycle = await getLatestCycle(ctx, userId)
  const incomeSources = (
    await ctx.db
      .query('incomeSources')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
  ).filter((source) => source.archivedAt === undefined)
  const debts = await ctx.db
    .query('debts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  const categories = await getCategories(ctx, userId)

  accounts.sort((a, b) => a.sortOrder - b.sortOrder)
  incomeSources.sort((a, b) => a.sortOrder - b.sortOrder)

  let transactions: Array<Doc<'transactions'>> = []
  let budgets: Array<Doc<'budgets'>> = []
  let cycleIncomePlans: Array<Doc<'cycleIncomePlans'>> = []

  if (currentCycle) {
    transactions = await ctx.db
      .query('transactions')
      .withIndex('by_user_and_cycle', (q) =>
        q.eq('userId', userId).eq('cycleId', currentCycle._id),
      )
      .collect()
    budgets = await ctx.db
      .query('budgets')
      .withIndex('by_user_and_cycle', (q) =>
        q.eq('userId', userId).eq('cycleId', currentCycle._id),
      )
      .collect()
    cycleIncomePlans = await getCycleIncomePlans(ctx, userId, currentCycle._id)
  }

  transactions.sort((a, b) => b.occurredAt - a.occurredAt)

  const savingsBalance = settings
    ? await computeSavingsBalance(ctx, userId, settings)
    : null

  let pendingAutoSave: {
    transactionId: Id<'transactions'>
    amount: number
    sourceName: string
    sourceId?: Id<'incomeSources'>
    savingsRate: number
    occurredAt: number
  } | null = null

  if (settings) {
    const autoSaveEvents = await ctx.db
      .query('autoSaveEvents')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const handledTransactionIds = new Set(
      autoSaveEvents.map((event) => event.transactionId),
    )
    const unhandledIncome = transactions.filter(
      (transaction) =>
        transaction.type === 'income' &&
        !handledTransactionIds.has(transaction._id),
    )

    for (const pendingIncome of unhandledIncome) {
      const linkedSource = pendingIncome.sourceId
        ? incomeSources.find((source) => source._id === pendingIncome.sourceId)
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
        transactionId: pendingIncome._id,
        amount,
        sourceName:
          cyclePlan?.sourceName ?? linkedSource?.name ?? pendingIncome.payee,
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
  }
}

export const bootstrap = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx)
    const cycle = await getLatestCycle(ctx, user._id)

    if (!cycle) {
      return null
    }

    return await loadBootstrapData(ctx, user._id)
  },
})

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx)
    return await getCategoriesWithReferences(ctx, user._id)
  },
})

export const createCategory = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    budgetGroup: v.union(v.literal('needs'), v.literal('wants')),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const name = validateCategoryName(args.name)
    validateCategoryIcon(args.icon)
    validateCategoryColor(args.color)
    await assertUniqueCategoryName(ctx, user._id, name)

    const categories = await getCategories(ctx, user._id)
    const sortOrder =
      categories.reduce(
        (highest, category) => Math.max(highest, category.sortOrder),
        -1,
      ) + 1
    const id = await ctx.db.insert('categories', {
      userId: user._id,
      key: crypto.randomUUID(),
      name,
      icon: args.icon,
      color: args.color,
      budgetGroup: args.budgetGroup,
      sortOrder,
      isSystem: false,
    })
    return await ctx.db.get(id)
  },
})

export const updateCategory = mutation({
  args: {
    id: v.id('categories'),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    budgetGroup: v.optional(v.union(v.literal('needs'), v.literal('wants'))),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const category = await requireOwnedCategory(ctx, user._id, args.id)

    if (category.isSystem && args.name !== undefined) {
      throw new Error('System categories cannot be renamed')
    }
    const name =
      args.name === undefined ? undefined : validateCategoryName(args.name)
    if (args.icon !== undefined) validateCategoryIcon(args.icon)
    if (args.color !== undefined) validateCategoryColor(args.color)
    if (name !== undefined) {
      await assertUniqueCategoryName(ctx, user._id, name, category._id)
    }

    const patch: {
      name?: string
      icon?: string
      color?: string
      budgetGroup?: 'needs' | 'wants'
    } = {}
    if (name !== undefined) patch.name = name
    if (args.icon !== undefined) patch.icon = args.icon
    if (args.color !== undefined) patch.color = args.color
    if (args.budgetGroup !== undefined) patch.budgetGroup = args.budgetGroup
    await ctx.db.patch(category._id, patch)
    return await ctx.db.get(category._id)
  },
})

export const restoreCategory = mutation({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const category = await requireOwnedCategory(ctx, user._id, args.id)
    await assertUniqueCategoryName(ctx, user._id, category.name, category._id)
    await ctx.db.patch(category._id, { archivedAt: undefined })
    return await ctx.db.get(category._id)
  },
})

export const deleteCategory = mutation({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const category = await requireOwnedCategory(ctx, user._id, args.id)
    if (category.isSystem) {
      throw new Error('System categories cannot be deleted')
    }

    if (await isCategoryReferenced(ctx, user._id, category.key)) {
      await ctx.db.patch(category._id, { archivedAt: Date.now() })
      return { archived: true }
    }

    await ctx.db.delete(category._id)
    return { archived: false }
  },
})

export const ensureDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx)
    return await seedDefaultCategoriesForUser(ctx, user._id)
  },
})

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx)
    const seeded = await seedData(ctx, user._id)
    await ensureCurrentCycle(ctx, user._id)
    return seeded
  },
})

export const onboardingData = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx)
    const settings = await getSettings(ctx, user._id)
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()
    const incomeSources = (
      await ctx.db
        .query('incomeSources')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect()
    ).filter((source) => source.archivedAt === undefined)
    const currentCycle = await getLatestCycle(ctx, user._id)
    const budgets = currentCycle
      ? await ctx.db
          .query('budgets')
          .withIndex('by_user_and_cycle', (q) =>
            q.eq('userId', user._id).eq('cycleId', currentCycle._id),
          )
          .collect()
      : []

    accounts.sort((a, b) => a.sortOrder - b.sortOrder)
    incomeSources.sort((a, b) => a.sortOrder - b.sortOrder)

    return {
      settings,
      accounts,
      incomeSources,
      budgets,
      spendingLimit: currentCycle?.spendingLimit ?? null,
      cycleIncomePlans: currentCycle
        ? await getCycleIncomePlans(ctx, user._id, currentCycle._id)
        : [],
    }
  },
})

const onboardingAccount = v.object({
  name: v.string(),
  kind: v.union(
    v.literal('bank'),
    v.literal('mobile'),
    v.literal('cash'),
    v.literal('investment'),
  ),
  currency: v.union(v.literal('MWK'), v.literal('USD')),
  balance: v.number(),
  includeInSpendable: v.optional(v.boolean()),
})

type OnboardingAccountInput = {
  name: string
  kind: 'bank' | 'mobile' | 'cash' | 'investment'
  currency: 'MWK' | 'USD'
  balance: number
  includeInSpendable?: boolean
}

type OnboardingIncomeSourceInput = {
  name: string
  expectedDayStart: number
  expectedDayEnd: number
  expectedAmount: number
  expectedAmountMax?: number
  savingsRate: number
  isAnchor: boolean
}

type CompleteOnboardingArgs = {
  usdRate: number
  defaultSavingsRate: number
  paydayDay: number
  savingsOpeningBalance: number
  spendingLimit: number
  accounts: Array<OnboardingAccountInput>
  incomeSources: Array<OnboardingIncomeSourceInput>
  budgets: Array<{ categoryId: string; plannedAmount: number }>
}

type CategoryPlanInput = {
  categoryId: string
  plannedAmount: number
}

type CycleIncomePlanInput = {
  sourceId: Id<'incomeSources'>
  expectedAmount: number
  expectedAmountMax?: number
  savingsRate: number
}

function assertNonnegativeFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be zero or more`)
  }
}

async function validateCategoryPlans(
  ctx: ReadCtx,
  userId: string,
  plans: Array<CategoryPlanInput>,
) {
  const categories = await getCategories(ctx, userId)
  const categoriesByKey = new Map(
    categories.map((category) => [category.key, category]),
  )
  const seen = new Set<string>()
  for (const plan of plans) {
    assertNonnegativeFinite(plan.plannedAmount, 'Planned amount')
    if (seen.has(plan.categoryId)) {
      throw new Error(`Duplicate category plan: ${plan.categoryId}`)
    }
    seen.add(plan.categoryId)
    if (!categoriesByKey.has(plan.categoryId)) {
      throw new Error(`Category not found: ${plan.categoryId}`)
    }
  }
}

function assertCategoryPlansFitLimit(
  plans: Array<CategoryPlanInput>,
  spendingLimit: number,
) {
  const total = plans.reduce((sum, plan) => sum + plan.plannedAmount, 0)
  if (total > spendingLimit) {
    throw new Error('Category plans cannot exceed the spending limit')
  }
}

async function validateCycleIncomePlans(
  ctx: ReadCtx,
  userId: string,
  plans: Array<CycleIncomePlanInput>,
) {
  const seen = new Set<Id<'incomeSources'>>()
  for (const plan of plans) {
    assertNonnegativeFinite(plan.expectedAmount, 'Expected income amount')
    if (
      plan.expectedAmountMax !== undefined &&
      (!Number.isFinite(plan.expectedAmountMax) ||
        plan.expectedAmountMax < plan.expectedAmount)
    ) {
      throw new Error(
        'Maximum expected income must be at least the expected amount',
      )
    }
    if (
      !Number.isFinite(plan.savingsRate) ||
      plan.savingsRate < 0 ||
      plan.savingsRate > 1
    ) {
      throw new Error('Savings rate must be between 0% and 100%')
    }
    if (seen.has(plan.sourceId)) {
      throw new Error(`Duplicate income plan: ${plan.sourceId}`)
    }
    seen.add(plan.sourceId)
    const source = await ctx.db.get(plan.sourceId)
    if (!source || source.userId !== userId) {
      throw new Error('Income source not found')
    }
  }
}

function validateIncomeSources(
  incomeSources: Array<OnboardingIncomeSourceInput>,
) {
  const seenNames = new Set<string>()
  for (const source of incomeSources) {
    const sourceName = source.name.trim()
    if (!sourceName) throw new Error('Income source names cannot be empty')
    const sourceKey = sourceName.toLowerCase()
    if (seenNames.has(sourceKey)) {
      throw new Error(`Duplicate income source: ${sourceName}`)
    }
    seenNames.add(sourceKey)
    if (
      !Number.isInteger(source.expectedDayStart) ||
      source.expectedDayStart < 1 ||
      source.expectedDayStart > 31 ||
      !Number.isInteger(source.expectedDayEnd) ||
      source.expectedDayEnd < source.expectedDayStart ||
      source.expectedDayEnd > 31
    ) {
      throw new Error('Income landing days must be between 1 and 31')
    }
    if (
      !Number.isFinite(source.expectedAmount) ||
      source.expectedAmount < 0 ||
      (source.expectedAmountMax !== undefined &&
        (!Number.isFinite(source.expectedAmountMax) ||
          source.expectedAmountMax < source.expectedAmount))
    ) {
      throw new Error('Expected income amounts must be valid and nonnegative')
    }
    if (
      !Number.isFinite(source.savingsRate) ||
      source.savingsRate < 0 ||
      source.savingsRate > 1
    ) {
      throw new Error('Income savings rates must be between 0% and 100%')
    }
  }
}

function validateOnboardingArgs(args: CompleteOnboardingArgs) {
  if (args.accounts.length === 0) {
    throw new Error('Add at least one account')
  }
  const seenNames = new Set<string>()
  for (const account of args.accounts) {
    const name = account.name.trim()
    if (!name) throw new Error('Account names cannot be empty')
    const key = name.toLowerCase()
    if (seenNames.has(key)) throw new Error(`Duplicate account: ${name}`)
    seenNames.add(key)
    if (!Number.isFinite(account.balance) || account.balance < 0) {
      throw new Error('Account balances must be zero or more')
    }
  }
  if (
    !Number.isInteger(args.paydayDay) ||
    args.paydayDay < 1 ||
    args.paydayDay > 28
  ) {
    throw new Error('Payday must be a day of the month between 1 and 28')
  }
  if (!Number.isFinite(args.usdRate) || args.usdRate <= 0) {
    throw new Error('USD rate must be a positive number')
  }
  if (
    !Number.isFinite(args.defaultSavingsRate) ||
    args.defaultSavingsRate < 0 ||
    args.defaultSavingsRate > 1
  ) {
    throw new Error('Default savings rate must be between 0% and 100%')
  }
  if (
    !Number.isFinite(args.savingsOpeningBalance) ||
    args.savingsOpeningBalance < 0
  ) {
    throw new Error('Savings balance must be zero or more')
  }
  if (!Number.isFinite(args.spendingLimit) || args.spendingLimit < 0) {
    throw new Error('Spending limit must be zero or more')
  }
  validateIncomeSources(args.incomeSources)
  for (const budget of args.budgets) {
    if (!Number.isFinite(budget.plannedAmount) || budget.plannedAmount < 0) {
      throw new Error('Planned amounts must be zero or more')
    }
  }
  assertCategoryPlansFitLimit(args.budgets, args.spendingLimit)
}

async function reconcileAccounts(
  ctx: MutationCtx,
  userId: string,
  accounts: Array<OnboardingAccountInput>,
) {
  const existingAccounts = await ctx.db
    .query('accounts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()

  const keptAccountIds = new Set<Id<'accounts'>>()
  const accountIds: Array<Id<'accounts'>> = []
  for (const [index, input] of accounts.entries()) {
    const match = existingAccounts.find(
      (account) =>
        account.name.toLowerCase() === input.name.trim().toLowerCase() &&
        !keptAccountIds.has(account._id),
    )
    if (match) {
      await ctx.db.patch(match._id, {
        name: input.name.trim(),
        kind: input.kind,
        currency: input.currency,
        balance: input.balance,
        sortOrder: index,
        includeInSpendable: input.includeInSpendable,
      })
      keptAccountIds.add(match._id)
      accountIds.push(match._id)
    } else {
      const accountId = await ctx.db.insert('accounts', {
        userId,
        name: input.name.trim(),
        kind: input.kind,
        currency: input.currency,
        balance: input.balance,
        sortOrder: index,
        ...(input.includeInSpendable !== undefined
          ? { includeInSpendable: input.includeInSpendable }
          : {}),
      })
      accountIds.push(accountId)
    }
  }

  const removedAccounts = existingAccounts.filter(
    (account) => !keptAccountIds.has(account._id),
  )
  if (removedAccounts.length > 0) {
    const userTransactions = await ctx.db
      .query('transactions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const referencedIds = new Set(
      userTransactions.flatMap((transaction) => {
        const ids: Array<Id<'accounts'>> = []
        if (transaction.accountId) ids.push(transaction.accountId)
        if (transaction.toAccountId) ids.push(transaction.toAccountId)
        return ids
      }),
    )
    let nextSortOrder = accounts.length
    for (const account of removedAccounts) {
      if (referencedIds.has(account._id)) {
        await ctx.db.patch(account._id, { sortOrder: nextSortOrder })
        nextSortOrder++
      } else {
        await ctx.db.delete(account._id)
      }
    }
  }

  return { accountIds, keptAccountIds }
}

async function reconcileIncomeSources(
  ctx: MutationCtx,
  userId: string,
  incomeSources: Array<OnboardingIncomeSourceInput>,
) {
  const existingSources = await ctx.db
    .query('incomeSources')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()

  const keptSourceIds = new Set<Id<'incomeSources'>>()
  for (const [sortOrder, input] of incomeSources.entries()) {
    const match = existingSources.find(
      (source) =>
        source.name.toLowerCase() === input.name.trim().toLowerCase() &&
        !keptSourceIds.has(source._id),
    )
    if (match) {
      await ctx.db.patch(match._id, {
        name: input.name.trim(),
        expectedDayStart: input.expectedDayStart,
        expectedDayEnd: input.expectedDayEnd,
        expectedAmount: input.expectedAmount,
        expectedAmountMax: input.expectedAmountMax,
        savingsRate: input.savingsRate,
        isAnchor: input.isAnchor,
        sortOrder,
        archivedAt: undefined,
      })
      keptSourceIds.add(match._id)
    } else {
      const sourceId = await ctx.db.insert('incomeSources', {
        userId,
        name: input.name.trim(),
        expectedDayStart: input.expectedDayStart,
        expectedDayEnd: input.expectedDayEnd,
        expectedAmount: input.expectedAmount,
        expectedAmountMax: input.expectedAmountMax,
        savingsRate: input.savingsRate,
        isAnchor: input.isAnchor,
        sortOrder,
      })
      keptSourceIds.add(sourceId)
    }
  }

  const removedSources = existingSources.filter(
    (source) => !keptSourceIds.has(source._id),
  )
  if (removedSources.length > 0) {
    const userTransactions = await ctx.db
      .query('transactions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const cycleIncomePlans = await ctx.db
      .query('cycleIncomePlans')
      .withIndex('by_user_and_source', (q) => q.eq('userId', userId))
      .collect()
    const referencedSourceIds = new Set(
      userTransactions
        .map((transaction) => transaction.sourceId)
        .filter(
          (sourceId): sourceId is Id<'incomeSources'> => sourceId !== undefined,
        ),
    )
    for (const plan of cycleIncomePlans) {
      referencedSourceIds.add(plan.sourceId)
    }
    let nextSortOrder = incomeSources.length
    for (const source of removedSources) {
      if (referencedSourceIds.has(source._id)) {
        await ctx.db.patch(source._id, {
          sortOrder: nextSortOrder,
          archivedAt: Date.now(),
        })
        nextSortOrder++
      } else {
        await ctx.db.delete(source._id)
      }
    }
  }
}

export const completeOnboarding = mutation({
  args: {
    usdRate: v.number(),
    defaultSavingsRate: v.number(),
    paydayDay: v.number(),
    savingsOpeningBalance: v.number(),
    spendingLimit: v.number(),
    accounts: v.array(onboardingAccount),
    incomeSources: v.array(
      v.object({
        name: v.string(),
        expectedDayStart: v.number(),
        expectedDayEnd: v.number(),
        expectedAmount: v.number(),
        expectedAmountMax: v.optional(v.number()),
        savingsRate: v.number(),
        isAnchor: v.boolean(),
      }),
    ),
    budgets: v.array(
      v.object({
        categoryId: v.string(),
        plannedAmount: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)

    validateOnboardingArgs(args)
    await seedDefaultCategoriesForUser(ctx, user._id)
    await validateCategoryPlans(ctx, user._id, args.budgets)

    const { accountIds } = await reconcileAccounts(ctx, user._id, args.accounts)

    const accountIdAt = (index: number) =>
      index >= 0 ? accountIds[index] : undefined
    const firstOfKind = (kind: (typeof args.accounts)[number]['kind']) =>
      accountIdAt(args.accounts.findIndex((account) => account.kind === kind))
    const firstAccountId = accountIds[0]
    const defaultExpenseAccountId =
      firstOfKind('mobile') ?? firstOfKind('cash') ?? firstAccountId
    const defaultTransferFromAccountId = firstOfKind('bank') ?? firstAccountId
    const defaultTransferToAccountId =
      firstOfKind('cash') ??
      accountIds.find((id) => id !== defaultTransferFromAccountId) ??
      defaultTransferFromAccountId

    const settings = await getSettings(ctx, user._id)
    const settingsValue = {
      usdRate: args.usdRate,
      defaultSavingsRate: args.defaultSavingsRate,
      defaultExpenseAccountId,
      defaultTransferFromAccountId,
      defaultTransferToAccountId,
      savingsOpeningBalance: args.savingsOpeningBalance,
      paydayDay: args.paydayDay,
      onboardedAt: Date.now(),
    }
    if (settings) {
      await ctx.db.patch(settings._id, settingsValue)
    } else {
      await ctx.db.insert('settings', { userId: user._id, ...settingsValue })
    }

    const now = Date.now()
    const cycles = await ctx.db
      .query('cycles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()
    const latestCycle =
      cycles.sort((a, b) => b.startsAt - a.startsAt).at(0) ?? null
    if (latestCycle) {
      const coveringCycle =
        cycles.find((cycle) => cycle.startsAt <= now && now <= cycle.endsAt) ??
        latestCycle
      const cycleTransactions = await ctx.db
        .query('transactions')
        .withIndex('by_user_and_cycle', (q) =>
          q.eq('userId', user._id).eq('cycleId', coveringCycle._id),
        )
        .collect()
      if (cycleTransactions.length === 0) {
        const period = getCyclePeriod(now, args.paydayDay)
        await ctx.db.patch(coveringCycle._id, period)
      }
      // Budgets attach to the current covering cycle until rollover when it already has transactions.
    }

    await reconcileIncomeSources(ctx, user._id, args.incomeSources)
    const cycle = await ensureCurrentCycle(ctx, user._id)
    await ctx.db.patch(cycle._id, { spendingLimit: args.spendingLimit })

    const existingBudgets = await ctx.db
      .query('budgets')
      .withIndex('by_user_and_cycle', (q) =>
        q.eq('userId', user._id).eq('cycleId', cycle._id),
      )
      .collect()
    const submittedBudgetIds = new Set(
      args.budgets.map((budget) => budget.categoryId),
    )
    const builtInBudgetIds = new Set<string>(
      DEFAULT_CATEGORIES.filter((category) => !category.isSystem).map(
        (category) => category.key,
      ),
    )
    const preservedCustomTotal = existingBudgets
      .filter(
        (budget) =>
          !submittedBudgetIds.has(budget.categoryId) &&
          !builtInBudgetIds.has(budget.categoryId),
      )
      .reduce((sum, budget) => sum + budget.plannedAmount, 0)
    const submittedTotal = args.budgets.reduce(
      (sum, budget) => sum + budget.plannedAmount,
      0,
    )
    if (preservedCustomTotal + submittedTotal > args.spendingLimit) {
      throw new Error('Category plans cannot exceed the spending limit')
    }
    for (const budget of existingBudgets) {
      if (
        submittedBudgetIds.has(budget.categoryId) ||
        builtInBudgetIds.has(budget.categoryId)
      ) {
        await ctx.db.delete(budget._id)
      }
    }
    for (const budget of args.budgets) {
      await ctx.db.insert('budgets', {
        userId: user._id,
        cycleId: cycle._id,
        categoryId: budget.categoryId,
        plannedAmount: budget.plannedAmount,
      })
    }

    const existingCycleIncomePlans = await getCycleIncomePlans(
      ctx,
      user._id,
      cycle._id,
    )
    for (const plan of existingCycleIncomePlans) {
      await ctx.db.delete(plan._id)
    }
    const incomeSources = (
      await ctx.db
        .query('incomeSources')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect()
    ).filter((source) => source.archivedAt === undefined)
    for (const source of incomeSources) {
      await ctx.db.insert('cycleIncomePlans', {
        userId: user._id,
        cycleId: cycle._id,
        sourceId: source._id,
        sourceName: source.name,
        expectedDayStart: source.expectedDayStart,
        expectedDayEnd: source.expectedDayEnd,
        expectedAmount: source.expectedAmount,
        expectedAmountMax: source.expectedAmountMax,
        savingsRate: source.savingsRate,
        isAnchor: source.isAnchor,
      })
    }
    return { cycleId: cycle._id }
  },
})

export const updateIncomeSources = mutation({
  args: {
    incomeSources: v.array(
      v.object({
        id: v.optional(v.id('incomeSources')),
        name: v.string(),
        expectedDayStart: v.number(),
        expectedDayEnd: v.number(),
        expectedAmount: v.number(),
        expectedAmountMax: v.optional(v.number()),
        savingsRate: v.number(),
        isAnchor: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    validateIncomeSources(args.incomeSources)

    const existingSources = await ctx.db
      .query('incomeSources')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()
    const existingById = new Map(
      existingSources.map((source) => [source._id, source]),
    )
    const keptIds = new Set<Id<'incomeSources'>>()

    for (const [sortOrder, input] of args.incomeSources.entries()) {
      const existing = input.id ? existingById.get(input.id) : undefined
      if (input.id && (!existing || existing.userId !== user._id)) {
        throw new Error('Income source not found')
      }
      const values = {
        name: input.name.trim(),
        expectedDayStart: input.expectedDayStart,
        expectedDayEnd: input.expectedDayEnd,
        expectedAmount: input.expectedAmount,
        expectedAmountMax: input.expectedAmountMax,
        savingsRate: input.savingsRate,
        isAnchor: input.isAnchor,
        sortOrder,
        archivedAt: undefined,
      }
      if (existing) {
        await ctx.db.patch(existing._id, values)
        keptIds.add(existing._id)
      } else {
        const id = await ctx.db.insert('incomeSources', {
          userId: user._id,
          ...values,
        })
        keptIds.add(id)
      }
    }

    const referencedIds = new Set<Id<'incomeSources'>>()
    const [transactions, allPlans] = await Promise.all([
      ctx.db
        .query('transactions')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect(),
      ctx.db
        .query('cycleIncomePlans')
        .withIndex('by_user_and_source', (q) => q.eq('userId', user._id))
        .collect(),
    ])
    for (const transaction of transactions) {
      if (transaction.sourceId) referencedIds.add(transaction.sourceId)
    }
    for (const plan of allPlans) referencedIds.add(plan.sourceId)
    for (const source of existingSources) {
      if (keptIds.has(source._id)) continue
      if (referencedIds.has(source._id)) {
        await ctx.db.patch(source._id, { archivedAt: Date.now() })
      } else {
        await ctx.db.delete(source._id)
      }
    }

    const cycle = await ensureCurrentCycle(ctx, user._id)
    const currentPlans = await getCycleIncomePlans(ctx, user._id, cycle._id)
    for (const plan of currentPlans) await ctx.db.delete(plan._id)
    const activeSources = (
      await ctx.db
        .query('incomeSources')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect()
    )
      .filter((source) => source.archivedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    for (const source of activeSources) {
      await ctx.db.insert('cycleIncomePlans', {
        userId: user._id,
        cycleId: cycle._id,
        sourceId: source._id,
        sourceName: source.name,
        expectedDayStart: source.expectedDayStart,
        expectedDayEnd: source.expectedDayEnd,
        expectedAmount: source.expectedAmount,
        expectedAmountMax: source.expectedAmountMax,
        savingsRate: source.savingsRate,
        isAnchor: source.isAnchor,
      })
    }
  },
})

export const saveCyclePlan = mutation({
  args: {
    cycleId: v.id('cycles'),
    spendingLimit: v.number(),
    categoryPlans: v.array(
      v.object({
        categoryId: v.string(),
        plannedAmount: v.number(),
      }),
    ),
    incomePlans: v.optional(
      v.array(
        v.object({
          sourceId: v.id('incomeSources'),
          expectedAmount: v.number(),
          expectedAmountMax: v.optional(v.number()),
          savingsRate: v.number(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const cycle = await requireOwnedCycle(ctx, user._id, args.cycleId)
    if (cycle.endsAt < Date.now()) {
      throw new Error('Closed cycle plans cannot be edited')
    }
    assertNonnegativeFinite(args.spendingLimit, 'Spending limit')
    await validateCategoryPlans(ctx, user._id, args.categoryPlans)
    assertCategoryPlansFitLimit(args.categoryPlans, args.spendingLimit)
    if (args.incomePlans !== undefined) {
      await validateCycleIncomePlans(ctx, user._id, args.incomePlans)
    }

    const existingBudgets = await ctx.db
      .query('budgets')
      .withIndex('by_user_and_cycle', (q) =>
        q.eq('userId', user._id).eq('cycleId', cycle._id),
      )
      .collect()
    for (const budget of existingBudgets) {
      await ctx.db.delete(budget._id)
    }
    for (const plan of args.categoryPlans) {
      await ctx.db.insert('budgets', {
        userId: user._id,
        cycleId: cycle._id,
        categoryId: plan.categoryId,
        plannedAmount: plan.plannedAmount,
      })
    }
    await ctx.db.patch(cycle._id, { spendingLimit: args.spendingLimit })

    if (args.incomePlans !== undefined) {
      const existingIncomePlans = await getCycleIncomePlans(
        ctx,
        user._id,
        cycle._id,
      )
      for (const plan of existingIncomePlans) {
        await ctx.db.delete(plan._id)
      }
      for (const plan of args.incomePlans) {
        const source = await ctx.db.get(plan.sourceId)
        if (!source || source.userId !== user._id) {
          throw new Error('Income source not found')
        }
        await ctx.db.insert('cycleIncomePlans', {
          userId: user._id,
          cycleId: cycle._id,
          sourceId: plan.sourceId,
          sourceName: source.name,
          expectedDayStart: source.expectedDayStart,
          expectedDayEnd: source.expectedDayEnd,
          expectedAmount: plan.expectedAmount,
          expectedAmountMax: plan.expectedAmountMax,
          savingsRate: plan.savingsRate,
          isAnchor: source.isAnchor,
        })
      }
    } else {
      await syncCycleIncomePlans(ctx, user._id, cycle._id)
    }

    return {
      cycleId: cycle._id,
      spendingLimit: args.spendingLimit,
      categoryPlanCount: args.categoryPlans.length,
      incomePlanCount:
        args.incomePlans?.length ??
        (await getCycleIncomePlans(ctx, user._id, cycle._id)).length,
    }
  },
})

export const budgetOverview = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx)
    const [cycles, categories] = await Promise.all([
      ctx.db
        .query('cycles')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect(),
      getCategories(ctx, user._id),
    ])

    cycles.sort((a, b) => b.startsAt - a.startsAt)

    const cycleViews = await Promise.all(
      cycles.map(async (cycle) => {
        const [budgets, plans, transactions] = await Promise.all([
          ctx.db
            .query('budgets')
            .withIndex('by_user_and_cycle', (q) =>
              q.eq('userId', user._id).eq('cycleId', cycle._id),
            )
            .collect(),
          getCycleIncomePlans(ctx, user._id, cycle._id),
          ctx.db
            .query('transactions')
            .withIndex('by_user_and_cycle', (q) =>
              q.eq('userId', user._id).eq('cycleId', cycle._id),
            )
            .collect(),
        ])

        const plannedByCategory = new Map(
          budgets.map((budget) => [budget.categoryId, budget.plannedAmount]),
        )
        const actualByCategory = spentByCategory(transactions)

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
              archived: category.archivedAt !== undefined,
            }
          })

        const actualIncomeBySource = new Map<Id<'incomeSources'>, number>()
        for (const transaction of transactions) {
          if (transaction.type !== 'income' || !transaction.sourceId) continue
          actualIncomeBySource.set(
            transaction.sourceId,
            (actualIncomeBySource.get(transaction.sourceId) ?? 0) +
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
        const actualSpending = totalBudgetSpending(transactions)
        const actualSavings = transactions.reduce((sum, transaction) => {
          if (transaction.type !== 'allocation') return sum
          if (transaction.direction === 'toSavings') {
            return sum + transaction.amount
          }
          if (transaction.direction === 'toSpending') {
            return sum - transaction.amount
          }
          return sum
        }, 0)
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
        }
      }),
    )

    return {
      cycles: cycleViews.map((view, index) => {
        const previous = cycleViews.at(index + 1)
        const previousByCategory = new Map(
          (previous?.categoryRows ?? [])
            .filter((row) => !row.archived)
            .map((row) => [row.categoryId, row.actualAmount]),
        )
        return {
          ...view,
          previousActualSpending: previous
            ? previous.categoryRows
                .filter((row) => !row.archived)
                .reduce((sum, row) => sum + row.actualAmount, 0)
            : undefined,
          categoryRows: view.categoryRows.map((row) => ({
            ...row,
            previousActualAmount: previous
              ? (previousByCategory.get(row.categoryId) ?? 0)
              : undefined,
          })),
        }
      }),
    }
  },
})

export const addTransaction = mutation({
  args: {
    type: userTransactionType,
    amount: v.number(),
    payee: v.string(),
    categoryId: v.optional(v.string()),
    accountId: v.id('accounts'),
    toAccountId: v.optional(v.id('accounts')),
    items: v.optional(v.string()),
    note: v.optional(v.string()),
    sourceId: v.optional(v.id('incomeSources')),
    occurredAt: v.optional(v.number()),
    excludeFromBudget: v.optional(v.boolean()),
    fromSavings: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const occurredAt = args.occurredAt ?? Date.now()
    const envelope = resolveEnvelopeFields(
      args.type,
      args.fromSavings,
      args.excludeFromBudget,
    )
    await validateTransactionInput(ctx, user._id, {
      ...args,
      excludeFromBudget: envelope.excludeFromBudget,
    })
    if (args.fromSavings) {
      await assertSavingsHasAmount(ctx, user._id, args.amount)
    }
    const cycle = await ensureCycleForDate(ctx, user._id, occurredAt)
    const input = await withCapturedFxRate(ctx, user._id, {
      ...args,
      excludeFromBudget: envelope.excludeFromBudget,
    })

    const transactionId = await ctx.db.insert('transactions', {
      userId: user._id,
      cycleId: cycle._id,
      type: args.type,
      amount: args.amount,
      payee: args.payee,
      categoryId: args.categoryId,
      accountId: args.accountId,
      toAccountId: args.toAccountId,
      walletId: envelope.walletId,
      items: args.items,
      note: args.note,
      sourceId: args.sourceId,
      excludeFromBudget: envelope.excludeFromBudget,
      occurredAt,
      ...(input.fxRate !== undefined ? { fxRate: input.fxRate } : {}),
    })

    await applyTransactionBalanceTransition(ctx, user._id, null, input)

    return transactionId
  },
})

export const updateTransaction = mutation({
  args: {
    transactionId: v.id('transactions'),
    type: transactionType,
    amount: v.number(),
    payee: v.string(),
    categoryId: v.optional(v.string()),
    accountId: v.optional(v.id('accounts')),
    toAccountId: v.optional(v.id('accounts')),
    items: v.optional(v.string()),
    note: v.optional(v.string()),
    sourceId: v.optional(v.id('incomeSources')),
    occurredAt: v.number(),
    excludeFromBudget: v.optional(v.boolean()),
    fromSavings: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const transaction = await requireOwnedTransaction(
      ctx,
      user._id,
      args.transactionId,
    )

    if (transaction.autoSave) {
      return await updateAutoSaveTransaction(ctx, user._id, transaction, args)
    }

    await assertMutableUserTransaction(ctx, transaction, 'edited')

    if (args.type === 'allocation') {
      throw new Error('Transactions cannot be converted into envelope moves')
    }

    const envelope = resolveEnvelopeFields(
      args.type,
      args.fromSavings,
      args.excludeFromBudget,
    )
    const nextInput = await withCapturedFxRate(ctx, user._id, {
      ...args,
      excludeFromBudget: envelope.excludeFromBudget,
      fxRate: transaction.fxRate,
    })
    await validateTransactionInput(ctx, user._id, nextInput)
    if (args.fromSavings) {
      await assertSavingsHasAmount(ctx, user._id, args.amount, transaction._id)
    }
    const cycle = await ensureCycleForDate(ctx, user._id, args.occurredAt)
    await applyTransactionBalanceTransition(
      ctx,
      user._id,
      transaction,
      nextInput,
    )
    await ctx.db.patch(transaction._id, {
      type: args.type,
      amount: args.amount,
      payee: args.payee,
      categoryId: args.categoryId,
      accountId: args.accountId,
      toAccountId: args.toAccountId,
      walletId: envelope.walletId,
      items: args.items,
      note: args.note,
      sourceId: args.sourceId,
      excludeFromBudget: envelope.excludeFromBudget,
      cycleId: cycle._id,
      occurredAt: args.occurredAt,
      ...(nextInput.fxRate !== undefined ? { fxRate: nextInput.fxRate } : {}),
    })

    return transaction._id
  },
})

export const deleteTransaction = mutation({
  args: {
    transactionId: v.id('transactions'),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const transaction = await requireOwnedTransaction(
      ctx,
      user._id,
      args.transactionId,
    )

    if (transaction.type === 'allocation') {
      await ctx.db.delete(transaction._id)
      return transaction._id
    }

    await assertMutableUserTransaction(ctx, transaction, 'deleted')
    await applyTransactionBalanceTransition(ctx, user._id, transaction, null)
    await ctx.db.delete(transaction._id)

    return transaction._id
  },
})

async function updateAutoSaveTransaction(
  ctx: MutationCtx,
  userId: string,
  transaction: Doc<'transactions'>,
  args: {
    type: Doc<'transactions'>['type']
    amount: number
    accountId?: Id<'accounts'>
    toAccountId?: Id<'accounts'>
    categoryId?: string
    occurredAt: number
    items?: string
    note?: string
  },
) {
  if (args.type !== 'allocation') {
    throw new Error('Auto-save allocations cannot change type')
  }
  if (args.toAccountId) {
    throw new Error('Auto-save moves to Savings, not another account')
  }
  if (args.categoryId) {
    throw new Error('A category is only valid for expenses')
  }

  assertPositiveAmount(args.amount)
  const cycle = await ensureCycleForDate(ctx, userId, args.occurredAt)

  await ctx.db.patch(transaction._id, {
    amount: args.amount,
    items: args.items,
    note: args.note,
    cycleId: cycle._id,
    occurredAt: args.occurredAt,
  })

  return transaction._id
}

export const confirmAutoSave = mutation({
  args: {
    transactionId: v.id('transactions'),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    assertPositiveAmount(args.amount)

    const incomeTransaction = await requireOwnedIncomeTransaction(
      ctx,
      user._id,
      args.transactionId,
    )
    const cycle = await ensureCurrentCycle(ctx, user._id)

    if (incomeTransaction.cycleId !== cycle._id) {
      throw new Error('Income transaction is not in the current cycle')
    }

    if (args.amount > incomeTransaction.amount) {
      throw new Error('Auto-save amount cannot exceed income amount')
    }

    await assertNoAutoSaveEvent(ctx, args.transactionId)
    const settings = await requireSettings(ctx, user._id)
    const [source, cyclePlans] = await Promise.all([
      incomeTransaction.sourceId
        ? ctx.db.get(incomeTransaction.sourceId)
        : Promise.resolve(null),
      getCycleIncomePlans(ctx, user._id, incomeTransaction.cycleId),
    ])
    const cyclePlan = incomeTransaction.sourceId
      ? cyclePlans.find((plan) => plan.sourceId === incomeTransaction.sourceId)
      : undefined
    const savingsRate =
      cyclePlan?.savingsRate ??
      source?.savingsRate ??
      settings.defaultSavingsRate

    const transactionId = await ctx.db.insert('transactions', {
      userId: user._id,
      cycleId: incomeTransaction.cycleId,
      type: 'allocation',
      direction: 'toSavings',
      amount: args.amount,
      payee: `Auto-save — ${Math.round(savingsRate * 100)}% of income`,
      walletId: 'savings',
      autoSave: true,
      excludeFromBudget: true,
      occurredAt: Date.now(),
    })
    await ctx.db.insert('autoSaveEvents', {
      userId: user._id,
      transactionId: args.transactionId,
      status: 'confirmed',
      amount: args.amount,
    })

    return transactionId
  },
})

export const dismissAutoSave = mutation({
  args: {
    transactionId: v.id('transactions'),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    assertPositiveAmount(args.amount)

    const incomeTransaction = await requireOwnedIncomeTransaction(
      ctx,
      user._id,
      args.transactionId,
    )
    const cycle = await ensureCurrentCycle(ctx, user._id)

    if (incomeTransaction.cycleId !== cycle._id) {
      throw new Error('Income transaction is not in the current cycle')
    }

    await assertNoAutoSaveEvent(ctx, args.transactionId)

    return await ctx.db.insert('autoSaveEvents', {
      userId: user._id,
      transactionId: args.transactionId,
      status: 'dismissed',
      amount: args.amount,
    })
  },
})

export const moveSavings = mutation({
  args: {
    amount: v.number(),
    direction: allocationDirection,
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    assertPositiveAmount(args.amount)

    const settings = await requireSettings(ctx, user._id)
    const savingsBalance = await computeSavingsBalance(ctx, user._id, settings)
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()
    const spendableTotalMwk = computeSpendableTotalMwk(
      accounts,
      settings.usdRate,
    )

    if (args.direction === 'toSpending') {
      if (args.amount > savingsBalance) {
        throw new Error('Not enough in savings')
      }
    } else if (args.amount > spendableTotalMwk - savingsBalance) {
      throw new Error('Not enough unallocated spending money')
    }

    const cycle = await ensureCurrentCycle(ctx, user._id)
    return await ctx.db.insert('transactions', {
      userId: user._id,
      cycleId: cycle._id,
      type: 'allocation',
      direction: args.direction,
      amount: args.amount,
      payee:
        args.direction === 'toSavings'
          ? 'Moved to savings'
          : 'Moved to spending',
      walletId: 'savings',
      excludeFromBudget: true,
      occurredAt: Date.now(),
    })
  },
})

export const setAccountSpendable = mutation({
  args: {
    accountId: v.id('accounts'),
    includeInSpendable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const account = await requireOwnedAccount(ctx, user._id, args.accountId)
    await ctx.db.patch(account._id, {
      includeInSpendable: args.includeInSpendable,
    })
    return account._id
  },
})

export const absorbAdjustment = mutation({
  args: {
    accountId: v.id('accounts'),
    actual: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const account = await requireOwnedAccount(ctx, user._id, args.accountId)
    const delta = args.actual - account.balance

    if (delta === 0) {
      return null
    }

    const cycle = await ensureCurrentCycle(ctx, user._id)
    const type = delta < 0 ? 'expense' : 'income'
    const transactionId = await ctx.db.insert('transactions', {
      userId: user._id,
      cycleId: cycle._id,
      type,
      amount: Math.abs(delta),
      payee: 'Balance adjustment',
      categoryId: type === 'expense' ? 'adjustment' : undefined,
      accountId: account._id,
      walletId: 'spending',
      note: args.note,
      adjustment: true,
      excludeFromBudget: true,
      occurredAt: Date.now(),
    })

    await ctx.db.patch(account._id, { balance: args.actual })

    return transactionId
  },
})
