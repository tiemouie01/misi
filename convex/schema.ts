import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  categories: defineTable({
    userId: v.string(),
    key: v.string(),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    sortOrder: v.number(),
    isSystem: v.boolean(),
    archivedAt: v.optional(v.number()),
  }).index('by_user', ['userId']),
  accounts: defineTable({
    userId: v.string(),
    name: v.string(),
    kind: v.union(
      v.literal('bank'),
      v.literal('mobile'),
      v.literal('cash'),
      v.literal('investment'),
    ),
    currency: v.union(v.literal('MWK'), v.literal('USD')),
    balance: v.number(),
    sortOrder: v.number(),
  }).index('by_user', ['userId']),
  cycles: defineTable({
    userId: v.string(),
    label: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    budget: v.number(),
  }).index('by_user', ['userId']),
  transactions: defineTable({
    userId: v.string(),
    cycleId: v.id('cycles'),
    type: v.union(
      v.literal('expense'),
      v.literal('income'),
      v.literal('transfer'),
    ),
    amount: v.number(),
    payee: v.string(),
    categoryId: v.optional(v.string()),
    accountId: v.id('accounts'),
    toAccountId: v.optional(v.id('accounts')),
    walletId: v.string(),
    items: v.optional(v.string()),
    note: v.optional(v.string()),
    adjustment: v.optional(v.boolean()),
    autoSave: v.optional(v.boolean()),
    sourceId: v.optional(v.id('incomeSources')),
    occurredAt: v.number(),
  })
    .index('by_user_and_cycle', ['userId', 'cycleId'])
    .index('by_user', ['userId'])
    .index('by_user_and_wallet', ['userId', 'walletId'])
    .index('by_user_and_category', ['userId', 'categoryId']),
  budgets: defineTable({
    userId: v.string(),
    cycleId: v.id('cycles'),
    categoryId: v.string(),
    budget: v.number(),
  })
    .index('by_user_and_cycle', ['userId', 'cycleId'])
    .index('by_user_and_category', ['userId', 'categoryId']),
  incomeSources: defineTable({
    userId: v.string(),
    name: v.string(),
    expected: v.string(),
    amountLabel: v.string(),
    splitPct: v.number(),
    sortOrder: v.number(),
  }).index('by_user', ['userId']),
  debts: defineTable({
    userId: v.string(),
    name: v.string(),
    balance: v.number(),
  }).index('by_user', ['userId']),
  settings: defineTable({
    userId: v.string(),
    usdRate: v.number(),
    autoSaveRate: v.number(),
    autoSaveSourceAccountId: v.optional(v.id('accounts')),
    defaultExpenseAccountId: v.optional(v.id('accounts')),
    defaultTransferFromAccountId: v.optional(v.id('accounts')),
    defaultTransferToAccountId: v.optional(v.id('accounts')),
    savingsOpeningBalance: v.number(),
    paydayDay: v.optional(v.number()),
    onboardedAt: v.optional(v.number()),
  }).index('by_user', ['userId']),
  autoSaveEvents: defineTable({
    userId: v.string(),
    transactionId: v.id('transactions'),
    status: v.union(v.literal('confirmed'), v.literal('dismissed')),
    amount: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_transaction', ['transactionId']),
})
