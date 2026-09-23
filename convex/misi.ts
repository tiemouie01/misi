/**
 * Public queries and mutations only. Business logic lives in `convex/model/`;
 * keep handlers here thin so the `api.misi.*` paths stay stable while the
 * implementation can move freely.
 */
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'

import { spentByCategory, totalBudgetSpending } from '../shared/budget-rollover'
import {
  assertDebtOpeningBalanceMutable,
  computeClaimRemaining,
  sortDebtsByRemaining,
} from '../shared/claim'
import { currencyToMwk, roundMoney } from '../shared/fx'
import { landedAmountForSource, totalActualIncome } from '../shared/income'
import {
  ONE_TAP_RECENTS_LIMIT,
  ONE_TAP_RECENTS_WINDOW_MS,
  oneTapRecentsFromLogs,
} from '../shared/one-tap-recents'
import { mutation, query } from './_generated/server'
import { requireAuthUser } from './auth'
import { DEFAULT_CATEGORIES } from './categories'
import {
  assertUniqueCategoryName,
  getCategories,
  getCategoriesWithReferences,
  isCategoryReferenced,
  requireOwnedCategory,
  seedDefaultCategoriesForUser,
  validateCategoryColor,
  validateCategoryIcon,
  validateCategoryName,
} from './model/categories'
import {
  insertTransaction,
  invalidateAllCheckpoints,
  latestCheckpoint,
  patchTransaction,
  removeTransaction,
} from './model/checkpoints'
import {
  assertNonnegativeFinite,
  assertPositiveAmount,
  getSettings,
  requireOwnedAccount,
  requireSettings,
  toClaimMovement,
} from './model/core'
import {
  assertCategoryPlansFitLimit,
  ensureCurrentCycle,
  ensureCycleForDate,
  getCycleIncomePlans,
  getCyclePeriod,
  getLatestCycle,
  requireOwnedCycle,
  syncCycleIncomePlans,
  validateCategoryPlans,
  validateCycleIncomePlans,
} from './model/cycles'
import {
  assertRemainingNonNegative,
  assertUniqueDebtName,
  computeDebtRemaining,
  getClaimMovements,
  presentDebt,
  requireOwnedDebt,
  validateDebtName,
} from './model/debts'
import { assertSavingsHasAmount, computeSavingsBalance } from './model/savings'
import {
  applyTransactionBalanceTransition,
  assertMutableUserTransaction,
  assertNoAutoSaveEvent,
  requireOwnedIncomeTransaction,
  requireOwnedTransaction,
  resolveEnvelopeFields,
  validateTransactionInput,
  withCapturedFxRate,
} from './model/transactions'
import {
  onboardingAccount,
  reconcileAccounts,
  reconcileIncomeSources,
  seedData,
  validateIncomeSources,
  validateOnboardingArgs,
} from './model/onboarding'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import type { ReadCtx } from './model/core'

const userTransactionType = v.union(
  v.literal('expense'),
  v.literal('income'),
  v.literal('transfer'),
  v.literal('claim'),
)

const transactionType = v.union(
  v.literal('expense'),
  v.literal('income'),
  v.literal('transfer'),
  v.literal('allocation'),
  v.literal('claim'),
)

const claimActionValidator = v.union(
  v.literal('borrow'),
  v.literal('lend'),
  v.literal('repay'),
  v.literal('collect'),
  v.literal('adjust'),
)

const adjustPolarityValidator = v.union(
  v.literal('increase'),
  v.literal('decrease'),
)

const debtDirectionValidator = v.union(
  v.literal('you_owe'),
  v.literal('owed_to_you'),
)

const allocationDirection = v.union(
  v.literal('toSavings'),
  v.literal('toSpending'),
)

/**
 * Every independent read runs in parallel. Convex round-trips are cheap
 * individually, but `bootstrap` is on the critical path of every app route, so
 * a chain of a dozen sequential awaits is latency the user feels on load.
 */
async function loadBootstrapData(
  ctx: ReadCtx,
  userId: string,
  currentCycle: Doc<'cycles'> | null,
) {
  const [
    settings,
    accounts,
    incomeSourceDocs,
    debtDocs,
    categories,
    checkpoint,
    autoSaveEventDocs,
    recentLogDocs,
  ] = await Promise.all([
    getSettings(ctx, userId),
    ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
    ctx.db
      .query('incomeSources')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
    ctx.db
      .query('debts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
    getCategories(ctx, userId),
    latestCheckpoint(ctx, userId),
    ctx.db
      .query('autoSaveEvents')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
    // One-tap recents only ever come from expenses, so bound this hot-path
    // read to them instead of every transaction in the window.
    ctx.db
      .query('transactions')
      .withIndex('by_user_and_type_and_time', (q) =>
        q
          .eq('userId', userId)
          .eq('type', 'expense')
          .gte('occurredAt', Date.now() - ONE_TAP_RECENTS_WINDOW_MS),
      )
      .collect(),
  ])

  const incomeSources = incomeSourceDocs.filter(
    (source) => source.archivedAt === undefined,
  )

  const [debts, cycleData, savingsBalance] = await Promise.all([
    Promise.all(
      debtDocs.map((debt) => presentDebt(ctx, userId, debt, checkpoint)),
    ).then(sortDebtsByRemaining),
    currentCycle
      ? Promise.all([
          ctx.db
            .query('transactions')
            .withIndex('by_user_and_cycle', (q) =>
              q.eq('userId', userId).eq('cycleId', currentCycle._id),
            )
            .collect(),
          ctx.db
            .query('budgets')
            .withIndex('by_user_and_cycle', (q) =>
              q.eq('userId', userId).eq('cycleId', currentCycle._id),
            )
            .collect(),
          getCycleIncomePlans(ctx, userId, currentCycle._id),
        ])
      : Promise.resolve([[], [], []] as [
          Array<Doc<'transactions'>>,
          Array<Doc<'budgets'>>,
          Array<Doc<'cycleIncomePlans'>>,
        ]),
    settings
      ? computeSavingsBalance(ctx, userId, settings, undefined, checkpoint)
      : null,
  ])

  const [transactions, budgets, cycleIncomePlans] = cycleData

  accounts.sort((a, b) => a.sortOrder - b.sortOrder)
  incomeSources.sort((a, b) => a.sortOrder - b.sortOrder)
  transactions.sort((a, b) => b.occurredAt - a.occurredAt)
  const oneTapRecents = oneTapRecentsFromLogs(recentLogDocs, {
    limit: ONE_TAP_RECENTS_LIMIT,
    sinceOccurredAt: Date.now() - ONE_TAP_RECENTS_WINDOW_MS,
  })
  const handledTransactionIds = new Set(
    autoSaveEventDocs.map((event) => event.transactionId),
  )

  let pendingAutoSave: {
    transactionId: Id<'transactions'>
    amount: number
    sourceName: string
    sourceId?: Id<'incomeSources'>
    savingsRate: number
    occurredAt: number
  } | null = null

  if (settings) {
    for (const pendingIncome of transactions) {
      if (pendingIncome.type !== 'income') continue
      if (pendingIncome.adjustment) continue
      if (handledTransactionIds.has(pendingIncome._id)) continue

      const linkedSource = pendingIncome.sourceId
        ? incomeSourceDocs.find(
            (source) => source._id === pendingIncome.sourceId,
          )
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
    oneTapRecents,
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

    return await loadBootstrapData(ctx, user._id, cycle)
  },
})

/** Newest-first transaction history across every cycle, for the home feed. */
export const listTransactions = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    return await ctx.db
      .query('transactions')
      .withIndex('by_user_and_time', (q) => q.eq('userId', user._id))
      .order('desc')
      .paginate(args.paginationOpts)
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
    const existingSettings = await getSettings(ctx, user._id)
    if (existingSettings?.onboardedAt !== undefined) {
      throw new Error('Onboarding has already been completed')
    }

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
    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, settingsValue)
    } else {
      await ctx.db.insert('settings', { userId: user._id, ...settingsValue })
    }
    await invalidateAllCheckpoints(ctx, user._id)

    const now = Date.now()
    const [latestCycle, startedCycle] = await Promise.all([
      ctx.db
        .query('cycles')
        .withIndex('by_user_and_start', (q) => q.eq('userId', user._id))
        .order('desc')
        .first(),
      getLatestCycle(ctx, user._id),
    ])
    if (latestCycle) {
      const coveringCycle =
        startedCycle && now <= startedCycle.endsAt ? startedCycle : latestCycle
      // Only the existence of a transaction matters, so stop at the first one
      // rather than pulling the whole cycle into memory.
      const firstTransaction = await ctx.db
        .query('transactions')
        .withIndex('by_user_and_cycle', (q) =>
          q.eq('userId', user._id).eq('cycleId', coveringCycle._id),
        )
        .first()
      if (firstTransaction === null) {
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
        if (
          !source ||
          source.userId !== user._id ||
          source.archivedAt !== undefined
        ) {
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
        .withIndex('by_user_and_start', (q) => q.eq('userId', user._id))
        .order('desc')
        .collect(),
      getCategories(ctx, user._id),
    ])

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

        const incomePlanRows = plans.map((plan) => {
          const actualAmount = landedAmountForSource(
            transactions,
            plan.sourceId,
          )
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
        const actualIncome = totalActualIncome(transactions)
        const assignedIncome = incomePlanRows.reduce(
          (sum, plan) => sum + plan.actualAmount,
          0,
        )
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
          unassignedIncome: actualIncome - assignedIncome,
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
    accountId: v.optional(v.id('accounts')),
    toAccountId: v.optional(v.id('accounts')),
    debtId: v.optional(v.id('debts')),
    claimAction: v.optional(claimActionValidator),
    adjustPolarity: v.optional(adjustPolarityValidator),
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
      args.claimAction,
    )
    const draft = {
      ...args,
      excludeFromBudget: envelope.excludeFromBudget,
    }
    await validateTransactionInput(ctx, user._id, draft)
    if (args.type === 'claim' && args.debtId && args.claimAction) {
      const debt = await requireOwnedDebt(ctx, user._id, args.debtId)
      const remaining = await computeDebtRemaining(
        ctx,
        user._id,
        debt,
        undefined,
        {
          action: args.claimAction,
          amount: args.amount,
          adjustPolarity: args.adjustPolarity,
        },
      )
      assertRemainingNonNegative(remaining)
    }
    if (args.fromSavings) {
      await assertSavingsHasAmount(ctx, user._id, args.amount)
    }
    const cycle = await ensureCycleForDate(ctx, user._id, occurredAt)
    const input = await withCapturedFxRate(ctx, user._id, draft)
    const payee =
      args.type === 'claim' && args.debtId
        ? (await requireOwnedDebt(ctx, user._id, args.debtId)).name
        : args.payee

    const transactionId = await insertTransaction(ctx, user._id, {
      userId: user._id,
      cycleId: cycle._id,
      type: args.type,
      amount: args.amount,
      payee,
      categoryId: args.categoryId,
      accountId: args.accountId,
      toAccountId: args.toAccountId,
      debtId: args.debtId,
      claimAction: args.claimAction,
      adjustPolarity: args.adjustPolarity,
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
    debtId: v.optional(v.id('debts')),
    claimAction: v.optional(claimActionValidator),
    adjustPolarity: v.optional(adjustPolarityValidator),
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
    if (transaction.type === 'claim' && args.type !== 'claim') {
      throw new Error('Claim transactions cannot change type')
    }
    if (transaction.type !== 'claim' && args.type === 'claim') {
      throw new Error('Transactions cannot be converted into claims')
    }

    const type = transaction.type === 'claim' ? 'claim' : args.type
    const debtId =
      transaction.type === 'claim' ? transaction.debtId : args.debtId
    const claimAction =
      transaction.type === 'claim' ? transaction.claimAction : args.claimAction
    const adjustPolarity =
      type === 'claim' && claimAction === 'adjust'
        ? (args.adjustPolarity ?? transaction.adjustPolarity)
        : type === 'claim'
          ? undefined
          : args.adjustPolarity

    const envelope = resolveEnvelopeFields(
      type,
      args.fromSavings,
      args.excludeFromBudget,
      claimAction,
    )
    const nextInput = await withCapturedFxRate(ctx, user._id, {
      ...args,
      type,
      debtId,
      claimAction,
      adjustPolarity,
      excludeFromBudget: envelope.excludeFromBudget,
      fxRate: transaction.fxRate,
    })
    await validateTransactionInput(ctx, user._id, nextInput, {
      allowArchivedDebt: type === 'claim',
      allowArchivedSourceId: transaction.sourceId,
    })
    if (type === 'claim' && debtId && claimAction) {
      const debt = await requireOwnedDebt(ctx, user._id, debtId)
      const remaining = await computeDebtRemaining(
        ctx,
        user._id,
        debt,
        transaction._id,
        {
          action: claimAction,
          amount: args.amount,
          adjustPolarity,
        },
      )
      assertRemainingNonNegative(remaining)
    }
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
    const payee = type === 'claim' ? transaction.payee : args.payee
    await patchTransaction(ctx, user._id, transaction, {
      type,
      amount: args.amount,
      payee,
      categoryId: args.categoryId,
      accountId: args.accountId,
      toAccountId: args.toAccountId,
      debtId,
      claimAction,
      adjustPolarity,
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
      return await removeTransaction(ctx, user._id, transaction)
    }

    await assertMutableUserTransaction(ctx, transaction, 'deleted')
    if (transaction.type === 'claim' && transaction.debtId) {
      const debt = await requireOwnedDebt(ctx, user._id, transaction.debtId)
      const remaining = await computeDebtRemaining(
        ctx,
        user._id,
        debt,
        transaction._id,
      )
      assertRemainingNonNegative(remaining)
    }
    await applyTransactionBalanceTransition(ctx, user._id, transaction, null)
    return await removeTransaction(ctx, user._id, transaction)
  },
})

export const listDebts = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx)
    const [debts, checkpoint] = await Promise.all([
      ctx.db
        .query('debts')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect(),
      latestCheckpoint(ctx, user._id),
    ])
    return sortDebtsByRemaining(
      await Promise.all(
        debts.map((debt) => presentDebt(ctx, user._id, debt, checkpoint)),
      ),
    )
  },
})

export const getDebt = query({
  args: { debtId: v.id('debts') },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const [debt, checkpoint] = await Promise.all([
      requireOwnedDebt(ctx, user._id, args.debtId),
      latestCheckpoint(ctx, user._id),
    ])
    const presented = await presentDebt(ctx, user._id, debt, checkpoint)
    const movements = (await getClaimMovements(ctx, user._id, debt._id)).sort(
      (left, right) => right.occurredAt - left.occurredAt,
    )
    return { ...presented, movements }
  },
})

export const createDebt = mutation({
  args: {
    name: v.string(),
    direction: debtDirectionValidator,
    openingBalance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const name = validateDebtName(args.name)
    await assertUniqueDebtName(ctx, user._id, name)
    const openingBalance = args.openingBalance ?? 0
    assertNonnegativeFinite(openingBalance, 'Opening balance')
    const existing = await ctx.db
      .query('debts')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()
    return await ctx.db.insert('debts', {
      userId: user._id,
      name,
      direction: args.direction,
      openingBalance,
      sortOrder: existing.length,
    })
  },
})

export const updateDebt = mutation({
  args: {
    debtId: v.id('debts'),
    name: v.optional(v.string()),
    openingBalance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const debt = await requireOwnedDebt(ctx, user._id, args.debtId)
    if (args.openingBalance !== undefined) {
      assertDebtOpeningBalanceMutable(debt.archivedAt)
    }
    const patch: {
      name?: string
      openingBalance?: number
    } = {}
    if (args.name !== undefined) {
      const name = validateDebtName(args.name)
      await assertUniqueDebtName(ctx, user._id, name, debt._id)
      patch.name = name
    }
    if (args.openingBalance !== undefined) {
      assertNonnegativeFinite(args.openingBalance, 'Opening balance')
      const remaining = computeClaimRemaining(
        args.openingBalance,
        (await getClaimMovements(ctx, user._id, debt._id)).map(toClaimMovement),
      )
      assertRemainingNonNegative(remaining)
      patch.openingBalance = args.openingBalance
      await invalidateAllCheckpoints(ctx, user._id)
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(debt._id, patch)
    }
    return debt._id
  },
})

export const archiveDebt = mutation({
  args: { debtId: v.id('debts') },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const debt = await requireOwnedDebt(ctx, user._id, args.debtId)
    if (debt.archivedAt !== undefined) return debt._id
    const remaining = await computeDebtRemaining(ctx, user._id, debt)
    if (remaining !== 0) {
      throw new Error(
        'Settle or adjust the remaining balance to zero before archiving',
      )
    }
    await ctx.db.patch(debt._id, { archivedAt: Date.now() })
    return debt._id
  },
})

export const restoreDebt = mutation({
  args: { debtId: v.id('debts') },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    const debt = await requireOwnedDebt(ctx, user._id, args.debtId)
    if (debt.archivedAt === undefined) return debt._id
    const name = validateDebtName(debt.name)
    await assertUniqueDebtName(ctx, user._id, name, debt._id)
    await ctx.db.patch(debt._id, { archivedAt: undefined })
    return debt._id
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

  await patchTransaction(ctx, userId, transaction, {
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

    const transactionId = await insertTransaction(ctx, user._id, {
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

    // Spending may go negative when moving to savings. That means the savings
    // earmark is larger than spendable cash — cutting into tangible savings.
    if (args.direction === 'toSpending' && args.amount > savingsBalance) {
      throw new Error('Not enough in savings')
    }

    const cycle = await ensureCurrentCycle(ctx, user._id)
    return await insertTransaction(ctx, user._id, {
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

    let fxRate: number | undefined
    let canonicalAmount = roundMoney(Math.abs(delta))
    if (account.currency === 'USD') {
      fxRate = (await requireSettings(ctx, user._id)).usdRate
      canonicalAmount = currencyToMwk(Math.abs(delta), 'USD', fxRate)
    }
    const cycle = await ensureCurrentCycle(ctx, user._id)
    const type = delta < 0 ? 'expense' : 'income'
    const transactionId = await insertTransaction(ctx, user._id, {
      userId: user._id,
      cycleId: cycle._id,
      type,
      amount: canonicalAmount,
      payee: 'Balance adjustment',
      categoryId: type === 'expense' ? 'adjustment' : undefined,
      accountId: account._id,
      walletId: 'spending',
      note: args.note,
      adjustment: true,
      excludeFromBudget: true,
      occurredAt: Date.now(),
      ...(fxRate !== undefined ? { fxRate } : {}),
    })

    await ctx.db.patch(account._id, { balance: args.actual })

    return transactionId
  },
})
