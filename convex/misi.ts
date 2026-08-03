import { v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { requireAuthUser } from './auth'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

const transactionType = v.union(
  v.literal('expense'),
  v.literal('income'),
  v.literal('transfer'),
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

function assertPositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number')
  }
}

const DEFAULT_PAYDAY_DAY = 20

function getCyclePeriod(now: number, paydayDay = DEFAULT_PAYDAY_DAY) {
  const today = new Date(now)
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()
  const day = today.getUTCDate()
  const startMonth = day >= paydayDay ? month : month - 1
  const startsAt = Date.UTC(year, startMonth, paydayDay)
  const endsAt = Date.UTC(year, startMonth + 1, paydayDay) - 1
  const startDate = new Date(startsAt)

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

  return cycles.sort((a, b) => b.startsAt - a.startsAt).at(0) ?? null
}

async function getSettings(ctx: ReadCtx, userId: string) {
  return await ctx.db
    .query('settings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
}

async function ensureCurrentCycle(ctx: MutationCtx, userId: string) {
  const now = Date.now()
  const settings = await getSettings(ctx, userId)
  const period = getCyclePeriod(now, settings?.paydayDay ?? DEFAULT_PAYDAY_DAY)
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
    (cycle) => cycle.startsAt <= now && now <= cycle.endsAt,
  )
  if (covering) {
    return covering
  }

  const latestCycle =
    cycles.sort((a, b) => b.startsAt - a.startsAt).at(0) ?? null
  const cycleId = await ctx.db.insert('cycles', {
    userId,
    ...period,
    budget: latestCycle?.budget ?? 0,
  })

  if (latestCycle) {
    const previousBudgets = await ctx.db
      .query('budgets')
      .withIndex('by_user_and_cycle', (q) =>
        q.eq('userId', userId).eq('cycleId', latestCycle._id),
      )
      .collect()

    for (const budget of previousBudgets) {
      await ctx.db.insert('budgets', {
        userId,
        cycleId,
        categoryId: budget.categoryId,
        budget: budget.budget,
      })
    }
  }

  const cycle = await ctx.db.get(cycleId)

  if (!cycle) {
    throw new Error('Failed to create cycle')
  }

  return cycle
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

  const nbmAccountId = await ctx.db.insert('accounts', {
    userId,
    name: 'NBM Bank',
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
    budget: 650000,
  })

  const budgets = [
    ['groceries', 220000],
    ['transport', 90000],
    ['eating-out', 60000],
    ['airtime', 30000],
    ['utilities', 80000],
  ] as const

  for (const [categoryId, budget] of budgets) {
    await ctx.db.insert('budgets', { userId, cycleId, categoryId, budget })
  }

  const incomeSources = [
    {
      name: 'Salary',
      expected: '20th',
      amountLabel: 'K1,850,000',
      splitPct: 20,
    },
    {
      name: 'Allowance',
      expected: '10th',
      amountLabel: 'K150,000',
      splitPct: 50,
    },
    {
      name: 'Secondary income',
      expected: '24th–30th',
      amountLabel: 'K300,000 – 450,000',
      splitPct: 20,
    },
  ] as const

  for (const [sortOrder, source] of incomeSources.entries()) {
    await ctx.db.insert('incomeSources', { userId, ...source, sortOrder })
  }

  await ctx.db.insert('debts', {
    userId,
    name: 'Chisomo',
    balance: 50000,
  })
  await ctx.db.insert('settings', {
    userId,
    usdRate: 1735,
    autoSaveRate: 0.2,
    autoSaveSourceAccountId: nbmAccountId,
    defaultExpenseAccountId: airtelAccountId,
    defaultTransferFromAccountId: nbmAccountId,
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
  const incomeSources = await ctx.db
    .query('incomeSources')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  const debts = await ctx.db
    .query('debts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()

  accounts.sort((a, b) => a.sortOrder - b.sortOrder)
  incomeSources.sort((a, b) => a.sortOrder - b.sortOrder)

  let transactions: Array<Doc<'transactions'>> = []
  let budgets: Array<Doc<'budgets'>> = []

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
  }

  transactions.sort((a, b) => b.occurredAt - a.occurredAt)

  const savingsTransactions = await ctx.db
    .query('transactions')
    .withIndex('by_user_and_wallet', (q) =>
      q.eq('userId', userId).eq('walletId', 'savings'),
    )
    .collect()
  const savingsTransfersTotal = savingsTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  )
  const savingsBalance = settings
    ? settings.savingsOpeningBalance + savingsTransfersTotal
    : null

  let pendingAutoSave: {
    transactionId: Id<'transactions'>
    amount: number
    sourceName: string
    sourceId?: Id<'incomeSources'>
  } | null = null

  if (settings) {
    const autoSaveEvents = await ctx.db
      .query('autoSaveEvents')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const handledTransactionIds = new Set(
      autoSaveEvents.map((event) => event.transactionId),
    )
    const pendingIncome = transactions.find(
      (transaction) =>
        transaction.type === 'income' &&
        !handledTransactionIds.has(transaction._id),
    )

    if (pendingIncome) {
      const linkedSource = pendingIncome.sourceId
        ? incomeSources.find((source) => source._id === pendingIncome.sourceId)
        : undefined

      pendingAutoSave = {
        transactionId: pendingIncome._id,
        amount: Math.round(pendingIncome.amount * settings.autoSaveRate),
        sourceName: linkedSource?.name ?? pendingIncome.payee,
        sourceId: pendingIncome.sourceId,
      }
    }
  }

  return {
    settings,
    accounts,
    currentCycle,
    transactions,
    budgets,
    incomeSources,
    debts,
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
    const incomeSources = await ctx.db
      .query('incomeSources')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()
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
      cycleBudget: currentCycle?.budget ?? null,
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
})

type OnboardingAccountInput = {
  name: string
  kind: 'bank' | 'mobile' | 'cash' | 'investment'
  currency: 'MWK' | 'USD'
  balance: number
}

type OnboardingIncomeSourceInput = {
  name: string
  expected: string
  amountLabel: string
  splitPct: number
}

type CompleteOnboardingArgs = {
  usdRate: number
  autoSaveRate: number
  paydayDay: number
  savingsOpeningBalance: number
  cycleBudget: number
  accounts: Array<OnboardingAccountInput>
  incomeSources: Array<OnboardingIncomeSourceInput>
  budgets: Array<{ categoryId: string; budget: number }>
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
    !Number.isFinite(args.autoSaveRate) ||
    args.autoSaveRate < 0 ||
    args.autoSaveRate > 0.95
  ) {
    throw new Error('Auto-save rate must be between 0% and 95%')
  }
  if (
    !Number.isFinite(args.savingsOpeningBalance) ||
    args.savingsOpeningBalance < 0
  ) {
    throw new Error('Savings balance must be zero or more')
  }
  if (!Number.isFinite(args.cycleBudget) || args.cycleBudget < 0) {
    throw new Error('Cycle budget must be zero or more')
  }
  for (const source of args.incomeSources) {
    if (!source.name.trim())
      throw new Error('Income source names cannot be empty')
    if (
      !Number.isFinite(source.splitPct) ||
      source.splitPct < 0 ||
      source.splitPct > 100
    ) {
      throw new Error('Income split must be between 0% and 100%')
    }
  }
  for (const budget of args.budgets) {
    if (!Number.isFinite(budget.budget) || budget.budget < 0) {
      throw new Error('Budget amounts must be zero or more')
    }
  }
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
      userTransactions.flatMap((transaction) =>
        transaction.toAccountId
          ? [transaction.accountId, transaction.toAccountId]
          : [transaction.accountId],
      ),
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
        expected: input.expected.trim(),
        amountLabel: input.amountLabel.trim(),
        splitPct: input.splitPct,
        sortOrder,
      })
      keptSourceIds.add(match._id)
    } else {
      const sourceId = await ctx.db.insert('incomeSources', {
        userId,
        name: input.name.trim(),
        expected: input.expected.trim(),
        amountLabel: input.amountLabel.trim(),
        splitPct: input.splitPct,
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
    const referencedSourceIds = new Set(
      userTransactions
        .map((transaction) => transaction.sourceId)
        .filter(
          (sourceId): sourceId is Id<'incomeSources'> => sourceId !== undefined,
        ),
    )
    let nextSortOrder = incomeSources.length
    for (const source of removedSources) {
      if (referencedSourceIds.has(source._id)) {
        await ctx.db.patch(source._id, { sortOrder: nextSortOrder })
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
    autoSaveRate: v.number(),
    paydayDay: v.number(),
    savingsOpeningBalance: v.number(),
    cycleBudget: v.number(),
    accounts: v.array(onboardingAccount),
    incomeSources: v.array(
      v.object({
        name: v.string(),
        expected: v.string(),
        amountLabel: v.string(),
        splitPct: v.number(),
      }),
    ),
    budgets: v.array(
      v.object({
        categoryId: v.string(),
        budget: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)

    validateOnboardingArgs(args)

    const { accountIds } = await reconcileAccounts(ctx, user._id, args.accounts)

    const accountIdAt = (index: number) =>
      index >= 0 ? accountIds[index] : undefined
    const firstOfKind = (kind: (typeof args.accounts)[number]['kind']) =>
      accountIdAt(args.accounts.findIndex((account) => account.kind === kind))
    const firstAccountId = accountIds[0]
    const autoSaveSourceAccountId = firstOfKind('bank') ?? firstAccountId
    const defaultExpenseAccountId =
      firstOfKind('mobile') ?? firstOfKind('cash') ?? firstAccountId
    const defaultTransferFromAccountId = autoSaveSourceAccountId
    const defaultTransferToAccountId =
      firstOfKind('cash') ??
      accountIds.find((id) => id !== defaultTransferFromAccountId) ??
      defaultTransferFromAccountId

    const settings = await getSettings(ctx, user._id)
    const settingsValue = {
      usdRate: args.usdRate,
      autoSaveRate: args.autoSaveRate,
      autoSaveSourceAccountId,
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

    const cycle = await ensureCurrentCycle(ctx, user._id)
    await ctx.db.patch(cycle._id, { budget: args.cycleBudget })

    const existingBudgets = await ctx.db
      .query('budgets')
      .withIndex('by_user_and_cycle', (q) =>
        q.eq('userId', user._id).eq('cycleId', cycle._id),
      )
      .collect()
    for (const budget of existingBudgets) {
      await ctx.db.delete(budget._id)
    }
    for (const budget of args.budgets) {
      await ctx.db.insert('budgets', {
        userId: user._id,
        cycleId: cycle._id,
        categoryId: budget.categoryId,
        budget: budget.budget,
      })
    }

    await reconcileIncomeSources(ctx, user._id, args.incomeSources)

    return { cycleId: cycle._id }
  },
})

export const addTransaction = mutation({
  args: {
    type: transactionType,
    amount: v.number(),
    payee: v.string(),
    categoryId: v.optional(v.string()),
    accountId: v.id('accounts'),
    toAccountId: v.optional(v.id('accounts')),
    items: v.optional(v.string()),
    note: v.optional(v.string()),
    sourceId: v.optional(v.id('incomeSources')),
    occurredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx)
    assertPositiveAmount(args.amount)

    const cycle = await ensureCurrentCycle(ctx, user._id)
    const account = await requireOwnedAccount(ctx, user._id, args.accountId)
    let toAccount: Doc<'accounts'> | null = null

    if (args.sourceId) {
      if (args.type !== 'income') {
        throw new Error('sourceId is only valid for income transactions')
      }
      const source = await ctx.db.get(args.sourceId)
      if (!source || source.userId !== user._id) {
        throw new Error('Income source not found')
      }
    }

    if (args.type === 'transfer') {
      if (!args.toAccountId) {
        throw new Error('A destination account is required for transfers')
      }
      if (args.toAccountId === args.accountId) {
        throw new Error('Transfer accounts must be different')
      }
      toAccount = await requireOwnedAccount(ctx, user._id, args.toAccountId)
    } else if (args.toAccountId) {
      throw new Error('A destination account is only valid for transfers')
    }

    const transactionId = await ctx.db.insert('transactions', {
      userId: user._id,
      cycleId: cycle._id,
      type: args.type,
      amount: args.amount,
      payee: args.payee,
      categoryId: args.categoryId,
      accountId: args.accountId,
      toAccountId: args.toAccountId,
      walletId: 'spending',
      items: args.items,
      note: args.note,
      sourceId: args.sourceId,
      occurredAt: args.occurredAt ?? Date.now(),
    })

    if (args.type === 'expense') {
      await ctx.db.patch(account._id, {
        balance: account.balance - args.amount,
      })
    } else if (args.type === 'income') {
      await ctx.db.patch(account._id, {
        balance: account.balance + args.amount,
      })
    } else if (toAccount) {
      await ctx.db.patch(account._id, {
        balance: account.balance - args.amount,
      })
      await ctx.db.patch(toAccount._id, {
        balance: toAccount.balance + args.amount,
      })
    }

    return transactionId
  },
})

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

    if (!settings.autoSaveSourceAccountId) {
      throw new Error('Auto-save source account is not configured')
    }

    const sourceAccount = await requireOwnedAccount(
      ctx,
      user._id,
      settings.autoSaveSourceAccountId,
    )

    const transactionId = await ctx.db.insert('transactions', {
      userId: user._id,
      cycleId: cycle._id,
      type: 'transfer',
      amount: args.amount,
      payee: `Auto-save — ${Math.round(settings.autoSaveRate * 100)}% of income`,
      accountId: settings.autoSaveSourceAccountId,
      walletId: 'savings',
      autoSave: true,
      occurredAt: Date.now(),
    })
    await ctx.db.patch(sourceAccount._id, {
      balance: sourceAccount.balance - args.amount,
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
      occurredAt: Date.now(),
    })

    await ctx.db.patch(account._id, { balance: args.actual })

    return transactionId
  },
})
