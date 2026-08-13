import { v } from 'convex/values'

import { requireAuthUser } from './auth'
import { MUTATION_ERROR_CODES, mutationError } from './mutationErrors'
import { mutation } from './_generated/server'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

type UserOwnedTable =
  | 'categories'
  | 'accounts'
  | 'cycles'
  | 'transactions'
  | 'budgets'
  | 'incomeSources'
  | 'cycleIncomePlans'
  | 'debts'
  | 'settings'
  | 'autoSaveEvents'

async function findByUuid<T extends UserOwnedTable>(
  ctx: MutationCtx,
  table: T,
  uuid: string,
): Promise<Doc<T> | null> {
  // Optional `uuid` + table-union generics make Convex's index eq too narrow.
  return (await ctx.db
    .query(table)
    .withIndex('by_uuid', (q) =>
      q.eq('uuid', uuid as NonNullable<Doc<T>['uuid']>),
    )
    .first())
}

async function requireOwnedByUuid<T extends UserOwnedTable>(
  ctx: MutationCtx,
  table: T,
  uuid: string,
  userId: string,
): Promise<Doc<T>> {
  const doc = await findByUuid(ctx, table, uuid)
  if (!doc) {
    throw mutationError(
      MUTATION_ERROR_CODES.NOT_FOUND,
      `No matching ${table} found for uuid=${uuid}`,
    )
  }
  if (doc.userId !== userId) {
    throw mutationError(
      MUTATION_ERROR_CODES.FORBIDDEN,
      `Not authorized to access ${table} uuid=${uuid}`,
    )
  }
  return doc
}

async function resolveOwnedRef<T extends UserOwnedTable>(
  ctx: MutationCtx,
  table: T,
  uuid: string,
  userId: string,
): Promise<Doc<T>> {
  const doc = await findByUuid(ctx, table, uuid)
  if (!doc || doc.userId !== userId) {
    throw mutationError(
      MUTATION_ERROR_CODES.NOT_FOUND,
      `No matching ${table} found for uuid=${uuid}`,
    )
  }
  return doc
}

function assertFinite(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw mutationError(
      MUTATION_ERROR_CODES.INVALID,
      `${label} must be a finite number`,
    )
  }
}

/**
 * PowerSync patches report cleared columns as `null`. Convex removes a field
 * when patched with `undefined`, so map null -> undefined for optional fields.
 */
function unsetIfNull<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

const accountKind = v.union(
  v.literal('bank'),
  v.literal('mobile'),
  v.literal('cash'),
  v.literal('investment'),
)
const currency = v.union(v.literal('MWK'), v.literal('USD'))
const budgetGroup = v.union(v.literal('needs'), v.literal('wants'))
const transactionType = v.union(
  v.literal('expense'),
  v.literal('income'),
  v.literal('transfer'),
)
const autoSaveStatus = v.union(v.literal('confirmed'), v.literal('dismissed'))

// --- categories ---

export const categoriesCreate = mutation({
  args: {
    uuid: v.string(),
    key: v.string(),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    budgetGroup,
    sortOrder: v.number(),
    isSystem: v.boolean(),
    archivedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = (await requireAuthUser(ctx))._id
    assertFinite(args.sortOrder, 'sortOrder')
    if (args.archivedAt !== undefined) {
      assertFinite(args.archivedAt, 'archivedAt')
    }
    const existing = await findByUuid(ctx, 'categories', args.uuid)
    if (existing) {
      if (existing.userId !== userId) {
        throw mutationError(
          MUTATION_ERROR_CODES.FORBIDDEN,
          `Not authorized to access categories uuid=${args.uuid}`,
        )
      }
      await ctx.db.patch(existing._id, {
        key: args.key,
        name: args.name,
        icon: args.icon,
        color: args.color,
        budgetGroup: args.budgetGroup,
        sortOrder: args.sortOrder,
        isSystem: args.isSystem,
        archivedAt: args.archivedAt,
      })
      return existing._id
    }
    return await ctx.db.insert('categories', {
      userId,
      uuid: args.uuid,
      key: args.key,
      name: args.name,
      icon: args.icon,
      color: args.color,
      budgetGroup: args.budgetGroup,
      sortOrder: args.sortOrder,
      isSystem: args.isSystem,
      archivedAt: args.archivedAt,
    })
  },
})

export const categoriesUpdate = mutation({
  args: {
    uuid: v.string(),
    key: v.optional(v.string()),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    budgetGroup: v.optional(budgetGroup),
    sortOrder: v.optional(v.number()),
    isSystem: v.optional(v.boolean()),
    archivedAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { uuid, archivedAt, ...fields }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(ctx, 'categories', uuid, userId)
    if (fields.sortOrder !== undefined) {
      assertFinite(fields.sortOrder, 'sortOrder')
    }
    if (archivedAt !== undefined && archivedAt !== null) {
      assertFinite(archivedAt, 'archivedAt')
    }
    const patch: Partial<Doc<'categories'>> = { ...fields }
    if (archivedAt !== undefined) patch.archivedAt = unsetIfNull(archivedAt)
    await ctx.db.patch(existing._id, patch)
  },
})

export const categoriesRemove = mutation({
  args: { uuid: v.string() },
  handler: async (ctx, { uuid }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(ctx, 'categories', uuid, userId)
    await ctx.db.delete(existing._id)
  },
})

// --- accounts ---

export const accountsCreate = mutation({
  args: {
    uuid: v.string(),
    name: v.string(),
    kind: accountKind,
    currency,
    balance: v.number(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = (await requireAuthUser(ctx))._id
    assertFinite(args.balance, 'balance')
    assertFinite(args.sortOrder, 'sortOrder')
    const existing = await findByUuid(ctx, 'accounts', args.uuid)
    if (existing) {
      if (existing.userId !== userId) {
        throw mutationError(
          MUTATION_ERROR_CODES.FORBIDDEN,
          `Not authorized to access accounts uuid=${args.uuid}`,
        )
      }
      await ctx.db.patch(existing._id, {
        name: args.name,
        kind: args.kind,
        currency: args.currency,
        balance: args.balance,
        sortOrder: args.sortOrder,
      })
      return existing._id
    }
    return await ctx.db.insert('accounts', {
      userId,
      uuid: args.uuid,
      name: args.name,
      kind: args.kind,
      currency: args.currency,
      balance: args.balance,
      sortOrder: args.sortOrder,
    })
  },
})

export const accountsUpdate = mutation({
  args: {
    uuid: v.string(),
    name: v.optional(v.string()),
    kind: v.optional(accountKind),
    currency: v.optional(currency),
    balance: v.optional(v.number()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { uuid, ...fields }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(ctx, 'accounts', uuid, userId)
    if (fields.balance !== undefined) assertFinite(fields.balance, 'balance')
    if (fields.sortOrder !== undefined) {
      assertFinite(fields.sortOrder, 'sortOrder')
    }
    await ctx.db.patch(existing._id, fields)
  },
})

export const accountsRemove = mutation({
  args: { uuid: v.string() },
  handler: async (ctx, { uuid }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(ctx, 'accounts', uuid, userId)
    await ctx.db.delete(existing._id)
  },
})

// --- cycles ---

export const cyclesCreate = mutation({
  args: {
    uuid: v.string(),
    label: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    spendingLimit: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = (await requireAuthUser(ctx))._id
    assertFinite(args.startsAt, 'startsAt')
    assertFinite(args.endsAt, 'endsAt')
    assertFinite(args.spendingLimit, 'spendingLimit')
    const existing = await findByUuid(ctx, 'cycles', args.uuid)
    if (existing) {
      if (existing.userId !== userId) {
        throw mutationError(
          MUTATION_ERROR_CODES.FORBIDDEN,
          `Not authorized to access cycles uuid=${args.uuid}`,
        )
      }
      await ctx.db.patch(existing._id, {
        label: args.label,
        startsAt: args.startsAt,
        endsAt: args.endsAt,
        spendingLimit: args.spendingLimit,
      })
      return existing._id
    }
    return await ctx.db.insert('cycles', {
      userId,
      uuid: args.uuid,
      label: args.label,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      spendingLimit: args.spendingLimit,
    })
  },
})

export const cyclesUpdate = mutation({
  args: {
    uuid: v.string(),
    label: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    spendingLimit: v.optional(v.number()),
  },
  handler: async (ctx, { uuid, ...fields }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(ctx, 'cycles', uuid, userId)
    if (fields.startsAt !== undefined) assertFinite(fields.startsAt, 'startsAt')
    if (fields.endsAt !== undefined) assertFinite(fields.endsAt, 'endsAt')
    if (fields.spendingLimit !== undefined) {
      assertFinite(fields.spendingLimit, 'spendingLimit')
    }
    await ctx.db.patch(existing._id, fields)
  },
})

export const cyclesRemove = mutation({
  args: { uuid: v.string() },
  handler: async (ctx, { uuid }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(ctx, 'cycles', uuid, userId)
    await ctx.db.delete(existing._id)
  },
})

// --- transactions ---

export const transactionsCreate = mutation({
  args: {
    uuid: v.string(),
    cycleUuid: v.string(),
    type: transactionType,
    amount: v.number(),
    payee: v.string(),
    categoryId: v.optional(v.string()),
    accountUuid: v.string(),
    toAccountUuid: v.optional(v.string()),
    walletId: v.string(),
    items: v.optional(v.string()),
    note: v.optional(v.string()),
    adjustment: v.optional(v.boolean()),
    autoSave: v.optional(v.boolean()),
    excludeFromBudget: v.boolean(),
    sourceUuid: v.optional(v.string()),
    occurredAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = (await requireAuthUser(ctx))._id
    assertFinite(args.amount, 'amount')
    assertFinite(args.occurredAt, 'occurredAt')

    const cycle = await resolveOwnedRef(ctx, 'cycles', args.cycleUuid, userId)
    const account = await resolveOwnedRef(
      ctx,
      'accounts',
      args.accountUuid,
      userId,
    )
    let toAccountId: Id<'accounts'> | undefined
    if (args.toAccountUuid !== undefined) {
      const toAccount = await resolveOwnedRef(
        ctx,
        'accounts',
        args.toAccountUuid,
        userId,
      )
      toAccountId = toAccount._id
    }
    let sourceId: Id<'incomeSources'> | undefined
    if (args.sourceUuid !== undefined) {
      const source = await resolveOwnedRef(
        ctx,
        'incomeSources',
        args.sourceUuid,
        userId,
      )
      sourceId = source._id
    }

    const values = {
      cycleId: cycle._id,
      cycleUuid: args.cycleUuid,
      type: args.type,
      amount: args.amount,
      payee: args.payee,
      categoryId: args.categoryId,
      accountId: account._id,
      accountUuid: args.accountUuid,
      toAccountId,
      toAccountUuid: args.toAccountUuid,
      walletId: args.walletId,
      items: args.items,
      note: args.note,
      adjustment: args.adjustment,
      autoSave: args.autoSave,
      excludeFromBudget: args.excludeFromBudget,
      sourceId,
      sourceUuid: args.sourceUuid,
      occurredAt: args.occurredAt,
    }

    const existing = await findByUuid(ctx, 'transactions', args.uuid)
    if (existing) {
      if (existing.userId !== userId) {
        throw mutationError(
          MUTATION_ERROR_CODES.FORBIDDEN,
          `Not authorized to access transactions uuid=${args.uuid}`,
        )
      }
      await ctx.db.patch(existing._id, values)
      return existing._id
    }
    return await ctx.db.insert('transactions', {
      userId,
      uuid: args.uuid,
      ...values,
    })
  },
})

export const transactionsUpdate = mutation({
  args: {
    uuid: v.string(),
    cycleUuid: v.optional(v.string()),
    type: v.optional(transactionType),
    amount: v.optional(v.number()),
    payee: v.optional(v.string()),
    categoryId: v.optional(v.union(v.string(), v.null())),
    accountUuid: v.optional(v.string()),
    toAccountUuid: v.optional(v.union(v.string(), v.null())),
    walletId: v.optional(v.string()),
    items: v.optional(v.union(v.string(), v.null())),
    note: v.optional(v.union(v.string(), v.null())),
    adjustment: v.optional(v.union(v.boolean(), v.null())),
    autoSave: v.optional(v.union(v.boolean(), v.null())),
    excludeFromBudget: v.optional(v.boolean()),
    sourceUuid: v.optional(v.union(v.string(), v.null())),
    occurredAt: v.optional(v.number()),
  },
  handler: async (ctx, { uuid, ...fields }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(
      ctx,
      'transactions',
      uuid,
      userId,
    )
    if (fields.amount !== undefined) assertFinite(fields.amount, 'amount')
    if (fields.occurredAt !== undefined) {
      assertFinite(fields.occurredAt, 'occurredAt')
    }

    const patch: Partial<Doc<'transactions'>> = {}
    if (fields.type !== undefined) patch.type = fields.type
    if (fields.amount !== undefined) patch.amount = fields.amount
    if (fields.payee !== undefined) patch.payee = fields.payee
    if (fields.categoryId !== undefined) {
      patch.categoryId = unsetIfNull(fields.categoryId)
    }
    if (fields.walletId !== undefined) patch.walletId = fields.walletId
    if (fields.items !== undefined) patch.items = unsetIfNull(fields.items)
    if (fields.note !== undefined) patch.note = unsetIfNull(fields.note)
    if (fields.adjustment !== undefined) {
      patch.adjustment = unsetIfNull(fields.adjustment)
    }
    if (fields.autoSave !== undefined) {
      patch.autoSave = unsetIfNull(fields.autoSave)
    }
    if (fields.excludeFromBudget !== undefined) {
      patch.excludeFromBudget = fields.excludeFromBudget
    }
    if (fields.occurredAt !== undefined) patch.occurredAt = fields.occurredAt

    if (fields.cycleUuid !== undefined) {
      const cycle = await resolveOwnedRef(
        ctx,
        'cycles',
        fields.cycleUuid,
        userId,
      )
      patch.cycleId = cycle._id
      patch.cycleUuid = fields.cycleUuid
    }
    if (fields.accountUuid !== undefined) {
      const account = await resolveOwnedRef(
        ctx,
        'accounts',
        fields.accountUuid,
        userId,
      )
      patch.accountId = account._id
      patch.accountUuid = fields.accountUuid
    }
    if (fields.toAccountUuid === null) {
      patch.toAccountId = undefined
      patch.toAccountUuid = undefined
    } else if (fields.toAccountUuid !== undefined) {
      const toAccount = await resolveOwnedRef(
        ctx,
        'accounts',
        fields.toAccountUuid,
        userId,
      )
      patch.toAccountId = toAccount._id
      patch.toAccountUuid = fields.toAccountUuid
    }
    if (fields.sourceUuid === null) {
      patch.sourceId = undefined
      patch.sourceUuid = undefined
    } else if (fields.sourceUuid !== undefined) {
      const source = await resolveOwnedRef(
        ctx,
        'incomeSources',
        fields.sourceUuid,
        userId,
      )
      patch.sourceId = source._id
      patch.sourceUuid = fields.sourceUuid
    }

    await ctx.db.patch(existing._id, patch)
  },
})

export const transactionsRemove = mutation({
  args: { uuid: v.string() },
  handler: async (ctx, { uuid }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(
      ctx,
      'transactions',
      uuid,
      userId,
    )
    await ctx.db.delete(existing._id)
  },
})

// --- budgets ---

export const budgetsCreate = mutation({
  args: {
    uuid: v.string(),
    cycleUuid: v.string(),
    categoryId: v.string(),
    plannedAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = (await requireAuthUser(ctx))._id
    assertFinite(args.plannedAmount, 'plannedAmount')
    const cycle = await resolveOwnedRef(ctx, 'cycles', args.cycleUuid, userId)
    const values = {
      cycleId: cycle._id,
      cycleUuid: args.cycleUuid,
      categoryId: args.categoryId,
      plannedAmount: args.plannedAmount,
    }
    const existing = await findByUuid(ctx, 'budgets', args.uuid)
    if (existing) {
      if (existing.userId !== userId) {
        throw mutationError(
          MUTATION_ERROR_CODES.FORBIDDEN,
          `Not authorized to access budgets uuid=${args.uuid}`,
        )
      }
      await ctx.db.patch(existing._id, values)
      return existing._id
    }
    return await ctx.db.insert('budgets', {
      userId,
      uuid: args.uuid,
      ...values,
    })
  },
})

export const budgetsUpdate = mutation({
  args: {
    uuid: v.string(),
    cycleUuid: v.optional(v.string()),
    categoryId: v.optional(v.string()),
    plannedAmount: v.optional(v.number()),
  },
  handler: async (ctx, { uuid, ...fields }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(ctx, 'budgets', uuid, userId)
    if (fields.plannedAmount !== undefined) {
      assertFinite(fields.plannedAmount, 'plannedAmount')
    }
    const patch: Partial<Doc<'budgets'>> = {}
    if (fields.categoryId !== undefined) patch.categoryId = fields.categoryId
    if (fields.plannedAmount !== undefined) {
      patch.plannedAmount = fields.plannedAmount
    }
    if (fields.cycleUuid !== undefined) {
      const cycle = await resolveOwnedRef(
        ctx,
        'cycles',
        fields.cycleUuid,
        userId,
      )
      patch.cycleId = cycle._id
      patch.cycleUuid = fields.cycleUuid
    }
    await ctx.db.patch(existing._id, patch)
  },
})

export const budgetsRemove = mutation({
  args: { uuid: v.string() },
  handler: async (ctx, { uuid }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(ctx, 'budgets', uuid, userId)
    await ctx.db.delete(existing._id)
  },
})

// --- incomeSources ---

export const incomeSourcesCreate = mutation({
  args: {
    uuid: v.string(),
    name: v.string(),
    expectedDayStart: v.number(),
    expectedDayEnd: v.number(),
    expectedAmount: v.number(),
    expectedAmountMax: v.optional(v.number()),
    savingsRate: v.number(),
    isAnchor: v.boolean(),
    sortOrder: v.number(),
    archivedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = (await requireAuthUser(ctx))._id
    assertFinite(args.expectedDayStart, 'expectedDayStart')
    assertFinite(args.expectedDayEnd, 'expectedDayEnd')
    assertFinite(args.expectedAmount, 'expectedAmount')
    assertFinite(args.savingsRate, 'savingsRate')
    assertFinite(args.sortOrder, 'sortOrder')
    if (args.expectedAmountMax !== undefined) {
      assertFinite(args.expectedAmountMax, 'expectedAmountMax')
    }
    if (args.archivedAt !== undefined) {
      assertFinite(args.archivedAt, 'archivedAt')
    }
    const values = {
      name: args.name,
      expectedDayStart: args.expectedDayStart,
      expectedDayEnd: args.expectedDayEnd,
      expectedAmount: args.expectedAmount,
      expectedAmountMax: args.expectedAmountMax,
      savingsRate: args.savingsRate,
      isAnchor: args.isAnchor,
      sortOrder: args.sortOrder,
      archivedAt: args.archivedAt,
    }
    const existing = await findByUuid(ctx, 'incomeSources', args.uuid)
    if (existing) {
      if (existing.userId !== userId) {
        throw mutationError(
          MUTATION_ERROR_CODES.FORBIDDEN,
          `Not authorized to access incomeSources uuid=${args.uuid}`,
        )
      }
      await ctx.db.patch(existing._id, values)
      return existing._id
    }
    return await ctx.db.insert('incomeSources', {
      userId,
      uuid: args.uuid,
      ...values,
    })
  },
})

export const incomeSourcesUpdate = mutation({
  args: {
    uuid: v.string(),
    name: v.optional(v.string()),
    expectedDayStart: v.optional(v.number()),
    expectedDayEnd: v.optional(v.number()),
    expectedAmount: v.optional(v.number()),
    expectedAmountMax: v.optional(v.union(v.number(), v.null())),
    savingsRate: v.optional(v.number()),
    isAnchor: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    archivedAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { uuid, expectedAmountMax, archivedAt, ...fields }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(
      ctx,
      'incomeSources',
      uuid,
      userId,
    )
    if (fields.expectedDayStart !== undefined) {
      assertFinite(fields.expectedDayStart, 'expectedDayStart')
    }
    if (fields.expectedDayEnd !== undefined) {
      assertFinite(fields.expectedDayEnd, 'expectedDayEnd')
    }
    if (fields.expectedAmount !== undefined) {
      assertFinite(fields.expectedAmount, 'expectedAmount')
    }
    if (expectedAmountMax !== undefined && expectedAmountMax !== null) {
      assertFinite(expectedAmountMax, 'expectedAmountMax')
    }
    if (fields.savingsRate !== undefined) {
      assertFinite(fields.savingsRate, 'savingsRate')
    }
    if (fields.sortOrder !== undefined) {
      assertFinite(fields.sortOrder, 'sortOrder')
    }
    if (archivedAt !== undefined && archivedAt !== null) {
      assertFinite(archivedAt, 'archivedAt')
    }
    const patch: Partial<Doc<'incomeSources'>> = { ...fields }
    if (expectedAmountMax !== undefined) {
      patch.expectedAmountMax = unsetIfNull(expectedAmountMax)
    }
    if (archivedAt !== undefined) {
      patch.archivedAt = unsetIfNull(archivedAt)
    }
    await ctx.db.patch(existing._id, patch)
  },
})

export const incomeSourcesRemove = mutation({
  args: { uuid: v.string() },
  handler: async (ctx, { uuid }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(
      ctx,
      'incomeSources',
      uuid,
      userId,
    )
    await ctx.db.delete(existing._id)
  },
})

// --- cycleIncomePlans ---

export const cycleIncomePlansCreate = mutation({
  args: {
    uuid: v.string(),
    cycleUuid: v.string(),
    sourceUuid: v.string(),
    sourceName: v.string(),
    expectedDayStart: v.number(),
    expectedDayEnd: v.number(),
    expectedAmount: v.number(),
    expectedAmountMax: v.optional(v.number()),
    savingsRate: v.number(),
    isAnchor: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = (await requireAuthUser(ctx))._id
    assertFinite(args.expectedDayStart, 'expectedDayStart')
    assertFinite(args.expectedDayEnd, 'expectedDayEnd')
    assertFinite(args.expectedAmount, 'expectedAmount')
    assertFinite(args.savingsRate, 'savingsRate')
    if (args.expectedAmountMax !== undefined) {
      assertFinite(args.expectedAmountMax, 'expectedAmountMax')
    }
    const cycle = await resolveOwnedRef(ctx, 'cycles', args.cycleUuid, userId)
    const source = await resolveOwnedRef(
      ctx,
      'incomeSources',
      args.sourceUuid,
      userId,
    )
    const values = {
      cycleId: cycle._id,
      cycleUuid: args.cycleUuid,
      sourceId: source._id,
      sourceUuid: args.sourceUuid,
      sourceName: args.sourceName,
      expectedDayStart: args.expectedDayStart,
      expectedDayEnd: args.expectedDayEnd,
      expectedAmount: args.expectedAmount,
      expectedAmountMax: args.expectedAmountMax,
      savingsRate: args.savingsRate,
      isAnchor: args.isAnchor,
    }
    const existing = await findByUuid(ctx, 'cycleIncomePlans', args.uuid)
    if (existing) {
      if (existing.userId !== userId) {
        throw mutationError(
          MUTATION_ERROR_CODES.FORBIDDEN,
          `Not authorized to access cycleIncomePlans uuid=${args.uuid}`,
        )
      }
      await ctx.db.patch(existing._id, values)
      return existing._id
    }
    return await ctx.db.insert('cycleIncomePlans', {
      userId,
      uuid: args.uuid,
      ...values,
    })
  },
})

export const cycleIncomePlansUpdate = mutation({
  args: {
    uuid: v.string(),
    cycleUuid: v.optional(v.string()),
    sourceUuid: v.optional(v.string()),
    sourceName: v.optional(v.string()),
    expectedDayStart: v.optional(v.number()),
    expectedDayEnd: v.optional(v.number()),
    expectedAmount: v.optional(v.number()),
    expectedAmountMax: v.optional(v.union(v.number(), v.null())),
    savingsRate: v.optional(v.number()),
    isAnchor: v.optional(v.boolean()),
  },
  handler: async (ctx, { uuid, ...fields }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(
      ctx,
      'cycleIncomePlans',
      uuid,
      userId,
    )
    if (fields.expectedDayStart !== undefined) {
      assertFinite(fields.expectedDayStart, 'expectedDayStart')
    }
    if (fields.expectedDayEnd !== undefined) {
      assertFinite(fields.expectedDayEnd, 'expectedDayEnd')
    }
    if (fields.expectedAmount !== undefined) {
      assertFinite(fields.expectedAmount, 'expectedAmount')
    }
    if (
      fields.expectedAmountMax !== undefined &&
      fields.expectedAmountMax !== null
    ) {
      assertFinite(fields.expectedAmountMax, 'expectedAmountMax')
    }
    if (fields.savingsRate !== undefined) {
      assertFinite(fields.savingsRate, 'savingsRate')
    }

    const patch: Partial<Doc<'cycleIncomePlans'>> = {}
    if (fields.sourceName !== undefined) patch.sourceName = fields.sourceName
    if (fields.expectedDayStart !== undefined) {
      patch.expectedDayStart = fields.expectedDayStart
    }
    if (fields.expectedDayEnd !== undefined) {
      patch.expectedDayEnd = fields.expectedDayEnd
    }
    if (fields.expectedAmount !== undefined) {
      patch.expectedAmount = fields.expectedAmount
    }
    if (fields.expectedAmountMax !== undefined) {
      patch.expectedAmountMax = unsetIfNull(fields.expectedAmountMax)
    }
    if (fields.savingsRate !== undefined) {
      patch.savingsRate = fields.savingsRate
    }
    if (fields.isAnchor !== undefined) patch.isAnchor = fields.isAnchor
    if (fields.cycleUuid !== undefined) {
      const cycle = await resolveOwnedRef(
        ctx,
        'cycles',
        fields.cycleUuid,
        userId,
      )
      patch.cycleId = cycle._id
      patch.cycleUuid = fields.cycleUuid
    }
    if (fields.sourceUuid !== undefined) {
      const source = await resolveOwnedRef(
        ctx,
        'incomeSources',
        fields.sourceUuid,
        userId,
      )
      patch.sourceId = source._id
      patch.sourceUuid = fields.sourceUuid
    }
    await ctx.db.patch(existing._id, patch)
  },
})

export const cycleIncomePlansRemove = mutation({
  args: { uuid: v.string() },
  handler: async (ctx, { uuid }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(
      ctx,
      'cycleIncomePlans',
      uuid,
      userId,
    )
    await ctx.db.delete(existing._id)
  },
})

// --- debts ---

export const debtsCreate = mutation({
  args: {
    uuid: v.string(),
    name: v.string(),
    balance: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = (await requireAuthUser(ctx))._id
    assertFinite(args.balance, 'balance')
    const existing = await findByUuid(ctx, 'debts', args.uuid)
    if (existing) {
      if (existing.userId !== userId) {
        throw mutationError(
          MUTATION_ERROR_CODES.FORBIDDEN,
          `Not authorized to access debts uuid=${args.uuid}`,
        )
      }
      await ctx.db.patch(existing._id, {
        name: args.name,
        balance: args.balance,
      })
      return existing._id
    }
    return await ctx.db.insert('debts', {
      userId,
      uuid: args.uuid,
      name: args.name,
      balance: args.balance,
    })
  },
})

export const debtsUpdate = mutation({
  args: {
    uuid: v.string(),
    name: v.optional(v.string()),
    balance: v.optional(v.number()),
  },
  handler: async (ctx, { uuid, ...fields }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(ctx, 'debts', uuid, userId)
    if (fields.balance !== undefined) assertFinite(fields.balance, 'balance')
    await ctx.db.patch(existing._id, fields)
  },
})

export const debtsRemove = mutation({
  args: { uuid: v.string() },
  handler: async (ctx, { uuid }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(ctx, 'debts', uuid, userId)
    await ctx.db.delete(existing._id)
  },
})

// --- settings ---

export const settingsCreate = mutation({
  args: {
    uuid: v.string(),
    usdRate: v.number(),
    defaultSavingsRate: v.number(),
    autoSaveSourceAccountUuid: v.optional(v.string()),
    defaultExpenseAccountUuid: v.optional(v.string()),
    defaultTransferFromAccountUuid: v.optional(v.string()),
    defaultTransferToAccountUuid: v.optional(v.string()),
    savingsOpeningBalance: v.number(),
    paydayDay: v.optional(v.number()),
    onboardedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = (await requireAuthUser(ctx))._id
    assertFinite(args.usdRate, 'usdRate')
    assertFinite(args.defaultSavingsRate, 'defaultSavingsRate')
    assertFinite(args.savingsOpeningBalance, 'savingsOpeningBalance')
    if (args.paydayDay !== undefined) assertFinite(args.paydayDay, 'paydayDay')
    if (args.onboardedAt !== undefined) {
      assertFinite(args.onboardedAt, 'onboardedAt')
    }

    let autoSaveSourceAccountId: Id<'accounts'> | undefined
    if (args.autoSaveSourceAccountUuid !== undefined) {
      autoSaveSourceAccountId = (
        await resolveOwnedRef(
          ctx,
          'accounts',
          args.autoSaveSourceAccountUuid,
          userId,
        )
      )._id
    }
    let defaultExpenseAccountId: Id<'accounts'> | undefined
    if (args.defaultExpenseAccountUuid !== undefined) {
      defaultExpenseAccountId = (
        await resolveOwnedRef(
          ctx,
          'accounts',
          args.defaultExpenseAccountUuid,
          userId,
        )
      )._id
    }
    let defaultTransferFromAccountId: Id<'accounts'> | undefined
    if (args.defaultTransferFromAccountUuid !== undefined) {
      defaultTransferFromAccountId = (
        await resolveOwnedRef(
          ctx,
          'accounts',
          args.defaultTransferFromAccountUuid,
          userId,
        )
      )._id
    }
    let defaultTransferToAccountId: Id<'accounts'> | undefined
    if (args.defaultTransferToAccountUuid !== undefined) {
      defaultTransferToAccountId = (
        await resolveOwnedRef(
          ctx,
          'accounts',
          args.defaultTransferToAccountUuid,
          userId,
        )
      )._id
    }

    const values = {
      usdRate: args.usdRate,
      defaultSavingsRate: args.defaultSavingsRate,
      autoSaveSourceAccountId,
      autoSaveSourceAccountUuid: args.autoSaveSourceAccountUuid,
      defaultExpenseAccountId,
      defaultExpenseAccountUuid: args.defaultExpenseAccountUuid,
      defaultTransferFromAccountId,
      defaultTransferFromAccountUuid: args.defaultTransferFromAccountUuid,
      defaultTransferToAccountId,
      defaultTransferToAccountUuid: args.defaultTransferToAccountUuid,
      savingsOpeningBalance: args.savingsOpeningBalance,
      paydayDay: args.paydayDay,
      onboardedAt: args.onboardedAt,
    }

    const existing = await findByUuid(ctx, 'settings', args.uuid)
    if (existing) {
      if (existing.userId !== userId) {
        throw mutationError(
          MUTATION_ERROR_CODES.FORBIDDEN,
          `Not authorized to access settings uuid=${args.uuid}`,
        )
      }
      await ctx.db.patch(existing._id, values)
      return existing._id
    }
    return await ctx.db.insert('settings', {
      userId,
      uuid: args.uuid,
      ...values,
    })
  },
})

export const settingsUpdate = mutation({
  args: {
    uuid: v.string(),
    usdRate: v.optional(v.number()),
    defaultSavingsRate: v.optional(v.number()),
    autoSaveSourceAccountUuid: v.optional(v.union(v.string(), v.null())),
    defaultExpenseAccountUuid: v.optional(v.union(v.string(), v.null())),
    defaultTransferFromAccountUuid: v.optional(v.union(v.string(), v.null())),
    defaultTransferToAccountUuid: v.optional(v.union(v.string(), v.null())),
    savingsOpeningBalance: v.optional(v.number()),
    paydayDay: v.optional(v.union(v.number(), v.null())),
    onboardedAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { uuid, ...fields }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(ctx, 'settings', uuid, userId)
    if (fields.usdRate !== undefined) assertFinite(fields.usdRate, 'usdRate')
    if (fields.defaultSavingsRate !== undefined) {
      assertFinite(fields.defaultSavingsRate, 'defaultSavingsRate')
    }
    if (fields.savingsOpeningBalance !== undefined) {
      assertFinite(fields.savingsOpeningBalance, 'savingsOpeningBalance')
    }
    if (fields.paydayDay !== undefined && fields.paydayDay !== null) {
      assertFinite(fields.paydayDay, 'paydayDay')
    }
    if (fields.onboardedAt !== undefined && fields.onboardedAt !== null) {
      assertFinite(fields.onboardedAt, 'onboardedAt')
    }

    const patch: Partial<Doc<'settings'>> = {}
    if (fields.usdRate !== undefined) patch.usdRate = fields.usdRate
    if (fields.defaultSavingsRate !== undefined) {
      patch.defaultSavingsRate = fields.defaultSavingsRate
    }
    if (fields.savingsOpeningBalance !== undefined) {
      patch.savingsOpeningBalance = fields.savingsOpeningBalance
    }
    if (fields.paydayDay !== undefined) {
      patch.paydayDay = unsetIfNull(fields.paydayDay)
    }
    if (fields.onboardedAt !== undefined) {
      patch.onboardedAt = unsetIfNull(fields.onboardedAt)
    }
    if (fields.autoSaveSourceAccountUuid === null) {
      patch.autoSaveSourceAccountId = undefined
      patch.autoSaveSourceAccountUuid = undefined
    } else if (fields.autoSaveSourceAccountUuid !== undefined) {
      patch.autoSaveSourceAccountId = (
        await resolveOwnedRef(
          ctx,
          'accounts',
          fields.autoSaveSourceAccountUuid,
          userId,
        )
      )._id
      patch.autoSaveSourceAccountUuid = fields.autoSaveSourceAccountUuid
    }
    if (fields.defaultExpenseAccountUuid === null) {
      patch.defaultExpenseAccountId = undefined
      patch.defaultExpenseAccountUuid = undefined
    } else if (fields.defaultExpenseAccountUuid !== undefined) {
      patch.defaultExpenseAccountId = (
        await resolveOwnedRef(
          ctx,
          'accounts',
          fields.defaultExpenseAccountUuid,
          userId,
        )
      )._id
      patch.defaultExpenseAccountUuid = fields.defaultExpenseAccountUuid
    }
    if (fields.defaultTransferFromAccountUuid === null) {
      patch.defaultTransferFromAccountId = undefined
      patch.defaultTransferFromAccountUuid = undefined
    } else if (fields.defaultTransferFromAccountUuid !== undefined) {
      patch.defaultTransferFromAccountId = (
        await resolveOwnedRef(
          ctx,
          'accounts',
          fields.defaultTransferFromAccountUuid,
          userId,
        )
      )._id
      patch.defaultTransferFromAccountUuid =
        fields.defaultTransferFromAccountUuid
    }
    if (fields.defaultTransferToAccountUuid === null) {
      patch.defaultTransferToAccountId = undefined
      patch.defaultTransferToAccountUuid = undefined
    } else if (fields.defaultTransferToAccountUuid !== undefined) {
      patch.defaultTransferToAccountId = (
        await resolveOwnedRef(
          ctx,
          'accounts',
          fields.defaultTransferToAccountUuid,
          userId,
        )
      )._id
      patch.defaultTransferToAccountUuid = fields.defaultTransferToAccountUuid
    }
    await ctx.db.patch(existing._id, patch)
  },
})

export const settingsRemove = mutation({
  args: { uuid: v.string() },
  handler: async (ctx, { uuid }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(ctx, 'settings', uuid, userId)
    await ctx.db.delete(existing._id)
  },
})

// --- autoSaveEvents ---

export const autoSaveEventsCreate = mutation({
  args: {
    uuid: v.string(),
    transactionUuid: v.string(),
    status: autoSaveStatus,
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = (await requireAuthUser(ctx))._id
    assertFinite(args.amount, 'amount')
    const transaction = await resolveOwnedRef(
      ctx,
      'transactions',
      args.transactionUuid,
      userId,
    )
    const values = {
      transactionId: transaction._id,
      transactionUuid: args.transactionUuid,
      status: args.status,
      amount: args.amount,
    }
    const existing = await findByUuid(ctx, 'autoSaveEvents', args.uuid)
    if (existing) {
      if (existing.userId !== userId) {
        throw mutationError(
          MUTATION_ERROR_CODES.FORBIDDEN,
          `Not authorized to access autoSaveEvents uuid=${args.uuid}`,
        )
      }
      await ctx.db.patch(existing._id, values)
      return existing._id
    }
    return await ctx.db.insert('autoSaveEvents', {
      userId,
      uuid: args.uuid,
      ...values,
    })
  },
})

export const autoSaveEventsUpdate = mutation({
  args: {
    uuid: v.string(),
    transactionUuid: v.optional(v.string()),
    status: v.optional(autoSaveStatus),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, { uuid, ...fields }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(
      ctx,
      'autoSaveEvents',
      uuid,
      userId,
    )
    if (fields.amount !== undefined) assertFinite(fields.amount, 'amount')
    const patch: Partial<Doc<'autoSaveEvents'>> = {}
    if (fields.status !== undefined) patch.status = fields.status
    if (fields.amount !== undefined) patch.amount = fields.amount
    if (fields.transactionUuid !== undefined) {
      const transaction = await resolveOwnedRef(
        ctx,
        'transactions',
        fields.transactionUuid,
        userId,
      )
      patch.transactionId = transaction._id
      patch.transactionUuid = fields.transactionUuid
    }
    await ctx.db.patch(existing._id, patch)
  },
})

export const autoSaveEventsRemove = mutation({
  args: { uuid: v.string() },
  handler: async (ctx, { uuid }) => {
    const userId = (await requireAuthUser(ctx))._id
    const existing = await requireOwnedByUuid(
      ctx,
      'autoSaveEvents',
      uuid,
      userId,
    )
    await ctx.db.delete(existing._id)
  },
})
