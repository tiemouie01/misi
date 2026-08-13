import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  categories: defineTable({
    userId: v.string(),
    uuid: v.optional(v.string()),
    key: v.string(),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    budgetGroup: v.union(v.literal('needs'), v.literal('wants')),
    sortOrder: v.number(),
    isSystem: v.boolean(),
    archivedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_uuid', ['uuid']),
  accounts: defineTable({
    userId: v.string(),
    uuid: v.optional(v.string()),
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
  })
    .index('by_user', ['userId'])
    .index('by_uuid', ['uuid']),
  cycles: defineTable({
    userId: v.string(),
    uuid: v.optional(v.string()),
    label: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    spendingLimit: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_uuid', ['uuid']),
  transactions: defineTable({
    userId: v.string(),
    uuid: v.optional(v.string()),
    cycleId: v.id('cycles'),
    cycleUuid: v.optional(v.string()),
    type: v.union(
      v.literal('expense'),
      v.literal('income'),
      v.literal('transfer'),
    ),
    amount: v.number(),
    payee: v.string(),
    categoryId: v.optional(v.string()),
    accountId: v.id('accounts'),
    accountUuid: v.optional(v.string()),
    toAccountId: v.optional(v.id('accounts')),
    toAccountUuid: v.optional(v.string()),
    walletId: v.string(),
    items: v.optional(v.string()),
    note: v.optional(v.string()),
    adjustment: v.optional(v.boolean()),
    autoSave: v.optional(v.boolean()),
    excludeFromBudget: v.boolean(),
    sourceId: v.optional(v.id('incomeSources')),
    sourceUuid: v.optional(v.string()),
    occurredAt: v.number(),
  })
    .index('by_user_and_cycle', ['userId', 'cycleId'])
    .index('by_user', ['userId'])
    .index('by_user_and_wallet', ['userId', 'walletId'])
    .index('by_user_and_category', ['userId', 'categoryId'])
    .index('by_uuid', ['uuid']),
  budgets: defineTable({
    userId: v.string(),
    uuid: v.optional(v.string()),
    cycleId: v.id('cycles'),
    cycleUuid: v.optional(v.string()),
    categoryId: v.string(),
    plannedAmount: v.number(),
  })
    .index('by_user_and_cycle', ['userId', 'cycleId'])
    .index('by_user_and_category', ['userId', 'categoryId'])
    .index('by_uuid', ['uuid']),
  incomeSources: defineTable({
    userId: v.string(),
    uuid: v.optional(v.string()),
    name: v.string(),
    expectedDayStart: v.number(),
    expectedDayEnd: v.number(),
    expectedAmount: v.number(),
    expectedAmountMax: v.optional(v.number()),
    savingsRate: v.number(),
    isAnchor: v.boolean(),
    sortOrder: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_uuid', ['uuid']),
  cycleIncomePlans: defineTable({
    userId: v.string(),
    uuid: v.optional(v.string()),
    cycleId: v.id('cycles'),
    cycleUuid: v.optional(v.string()),
    sourceId: v.id('incomeSources'),
    sourceUuid: v.optional(v.string()),
    sourceName: v.string(),
    expectedDayStart: v.number(),
    expectedDayEnd: v.number(),
    expectedAmount: v.number(),
    expectedAmountMax: v.optional(v.number()),
    savingsRate: v.number(),
    isAnchor: v.boolean(),
  })
    .index('by_user_and_cycle', ['userId', 'cycleId'])
    .index('by_user_and_cycle_and_source', ['userId', 'cycleId', 'sourceId'])
    .index('by_user_and_source', ['userId', 'sourceId'])
    .index('by_uuid', ['uuid']),
  debts: defineTable({
    userId: v.string(),
    uuid: v.optional(v.string()),
    name: v.string(),
    balance: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_uuid', ['uuid']),
  settings: defineTable({
    userId: v.string(),
    uuid: v.optional(v.string()),
    usdRate: v.number(),
    defaultSavingsRate: v.number(),
    autoSaveSourceAccountId: v.optional(v.id('accounts')),
    autoSaveSourceAccountUuid: v.optional(v.string()),
    defaultExpenseAccountId: v.optional(v.id('accounts')),
    defaultExpenseAccountUuid: v.optional(v.string()),
    defaultTransferFromAccountId: v.optional(v.id('accounts')),
    defaultTransferFromAccountUuid: v.optional(v.string()),
    defaultTransferToAccountId: v.optional(v.id('accounts')),
    defaultTransferToAccountUuid: v.optional(v.string()),
    savingsOpeningBalance: v.number(),
    paydayDay: v.optional(v.number()),
    onboardedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_uuid', ['uuid']),
  autoSaveEvents: defineTable({
    userId: v.string(),
    uuid: v.optional(v.string()),
    transactionId: v.id('transactions'),
    transactionUuid: v.optional(v.string()),
    status: v.union(v.literal('confirmed'), v.literal('dismissed')),
    amount: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_transaction', ['transactionId'])
    .index('by_uuid', ['uuid']),
  powersync_checkpoints: defineTable({
    last_updated: v.float64(),
  }),
})
