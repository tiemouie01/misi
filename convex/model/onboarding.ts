import { ConvexError, v } from 'convex/values'

import { assertCategoryPlansFitLimit, getCyclePeriod } from './cycles'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

export const onboardingAccount = v.object({
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

export type OnboardingAccountInput = {
  name: string
  kind: 'bank' | 'mobile' | 'cash' | 'investment'
  currency: 'MWK' | 'USD'
  balance: number
  includeInSpendable?: boolean
}

export type OnboardingIncomeSourceInput = {
  name: string
  expectedDayStart: number
  expectedDayEnd: number
  expectedAmount: number
  expectedAmountMax?: number
  savingsRate: number
  isAnchor: boolean
}

export type CompleteOnboardingArgs = {
  usdRate: number
  defaultSavingsRate: number
  paydayDay: number
  savingsOpeningBalance: number
  spendingLimit: number
  accounts: Array<OnboardingAccountInput>
  incomeSources: Array<OnboardingIncomeSourceInput>
  budgets: Array<{ categoryId: string; plannedAmount: number }>
}

export function validateIncomeSources(
  incomeSources: Array<OnboardingIncomeSourceInput>,
) {
  const seenNames = new Set<string>()
  for (const source of incomeSources) {
    const sourceName = source.name.trim()
    if (!sourceName) throw new ConvexError('Every income source needs a name')
    const sourceKey = sourceName.toLowerCase()
    if (seenNames.has(sourceKey)) {
      throw new ConvexError(
        `You already have an income source named ${sourceName}`,
      )
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
      throw new ConvexError('Income days must be between 1 and 31')
    }
    if (
      !Number.isFinite(source.expectedAmount) ||
      source.expectedAmount < 0 ||
      (source.expectedAmountMax !== undefined &&
        (!Number.isFinite(source.expectedAmountMax) ||
          source.expectedAmountMax < source.expectedAmount))
    ) {
      throw new ConvexError('Expected income amounts must be zero or more')
    }
    if (
      !Number.isFinite(source.savingsRate) ||
      source.savingsRate < 0 ||
      source.savingsRate > 1
    ) {
      throw new ConvexError('Savings rates must be between 0% and 100%')
    }
  }
}

/** Validates one account and returns its trimmed name. */
export function validateAccountInput(account: OnboardingAccountInput) {
  const name = account.name.trim()
  if (!name) throw new ConvexError('Every account needs a name')
  if (!Number.isFinite(account.balance) || account.balance < 0) {
    throw new ConvexError('Account balances must be zero or more')
  }
  return name
}

export function validateOnboardingArgs(args: CompleteOnboardingArgs) {
  if (args.accounts.length === 0) {
    throw new ConvexError('Add at least one account')
  }
  const seenNames = new Set<string>()
  for (const account of args.accounts) {
    const name = validateAccountInput(account)
    const key = name.toLowerCase()
    if (seenNames.has(key))
      throw new ConvexError(`You already have an account named ${name}`)
    seenNames.add(key)
  }
  if (
    !Number.isInteger(args.paydayDay) ||
    args.paydayDay < 1 ||
    args.paydayDay > 28
  ) {
    throw new ConvexError(
      'Payday must be between day 1 and day 28 of the month',
    )
  }
  if (!Number.isFinite(args.usdRate) || args.usdRate <= 0) {
    throw new ConvexError('Enter a USD rate greater than zero')
  }
  if (
    !Number.isFinite(args.defaultSavingsRate) ||
    args.defaultSavingsRate < 0 ||
    args.defaultSavingsRate > 1
  ) {
    throw new ConvexError('Savings rate must be between 0% and 100%')
  }
  if (
    !Number.isFinite(args.savingsOpeningBalance) ||
    args.savingsOpeningBalance < 0
  ) {
    throw new ConvexError('Savings balance must be zero or more')
  }
  if (!Number.isFinite(args.spendingLimit) || args.spendingLimit < 0) {
    throw new ConvexError('Spending limit must be zero or more')
  }
  validateIncomeSources(args.incomeSources)
  for (const budget of args.budgets) {
    if (!Number.isFinite(budget.plannedAmount) || budget.plannedAmount < 0) {
      throw new ConvexError('Planned amounts must be zero or more')
    }
  }
  assertCategoryPlansFitLimit(args.budgets, args.spendingLimit)
}

export async function reconcileAccounts(
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

/** Adds one account after onboarding, appended to the end of the list. */
export async function createAccount(
  ctx: MutationCtx,
  userId: string,
  input: OnboardingAccountInput,
) {
  const name = validateAccountInput(input)
  const existingAccounts = await ctx.db
    .query('accounts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  if (
    existingAccounts.some(
      (account) => account.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    throw new ConvexError(`You already have an account named ${name}`)
  }
  return await ctx.db.insert('accounts', {
    userId,
    name,
    kind: input.kind,
    currency: input.currency,
    balance: input.balance,
    sortOrder:
      Math.max(-1, ...existingAccounts.map((account) => account.sortOrder)) + 1,
    ...(input.includeInSpendable !== undefined
      ? { includeInSpendable: input.includeInSpendable }
      : {}),
  })
}

export async function reconcileIncomeSources(
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

export async function seedData(ctx: MutationCtx, userId: string) {
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
