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

function getCyclePeriod(now: number) {
  const today = new Date(now)
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()
  const day = today.getUTCDate()
  const startMonth = day >= 20 ? month : month - 1
  const startsAt = Date.UTC(year, startMonth, 20)
  const endsAt = Date.UTC(year, startMonth + 1, 20) - 1
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
  const period = getCyclePeriod(now)
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
