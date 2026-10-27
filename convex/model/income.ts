import { ConvexError } from 'convex/values'
import { currencyToMwk, roundMoney } from '../../shared/fx'
import { requireActiveAccount } from './accounts'
import { insertTransaction } from './checkpoints'
import { assertPositiveAmount, requireSettings } from './core'
import { ensureCurrentCycle, requireOwnedCycle } from './cycles'
import { isSpendableAccount } from './savings'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

export type OneOffIncomeInput = {
  name: string
  expectedAmount: number
  /** Day of the month it should arrive; omitted means any day this cycle. */
  expectedDay?: number
}

function validateOneOffIncome(input: OneOffIncomeInput) {
  const name = input.name.trim()
  if (!name) throw new ConvexError('Give this income a name')
  assertPositiveAmount(input.expectedAmount)
  if (
    input.expectedDay !== undefined &&
    (!Number.isInteger(input.expectedDay) ||
      input.expectedDay < 1 ||
      input.expectedDay > 31)
  ) {
    throw new ConvexError('The expected day must be between 1 and 31')
  }
  return {
    name,
    expectedAmount: input.expectedAmount,
    expectedDayStart: input.expectedDay ?? 1,
    expectedDayEnd: input.expectedDay ?? 31,
  }
}

async function requireOpenCycle(
  ctx: MutationCtx,
  userId: string,
  cycleId: Id<'cycles'>,
) {
  const cycle = await requireOwnedCycle(ctx, userId, cycleId)
  if (cycle.endsAt < Date.now()) {
    throw new ConvexError(
      'This cycle has closed, so its income can no longer be edited',
    )
  }
  return cycle
}

async function requireOneOffSource(
  ctx: MutationCtx,
  userId: string,
  sourceId: Id<'incomeSources'>,
) {
  const source = await ctx.db.get(sourceId)
  if (
    !source ||
    source.userId !== userId ||
    source.archivedAt !== undefined ||
    source.oneOffCycleId === undefined
  ) {
    throw new Error('One-off income not found')
  }
  const cycle = await requireOpenCycle(ctx, userId, source.oneOffCycleId)
  const plan = await ctx.db
    .query('cycleIncomePlans')
    .withIndex('by_user_and_cycle_and_source', (q) =>
      q
        .eq('userId', userId)
        .eq('cycleId', cycle._id)
        .eq('sourceId', source._id),
    )
    .first()
  return { source, cycle, plan }
}

/**
 * A one-off is an income source scoped to one cycle plus that cycle's plan
 * row, so linking income, landed amounts and auto-save work exactly as for
 * paydays, while rollover skips it. It saves at the default rate.
 */
export async function addOneOffIncome(
  ctx: MutationCtx,
  userId: string,
  cycleId: Id<'cycles'>,
  input: OneOffIncomeInput,
) {
  const values = validateOneOffIncome(input)
  const cycle = await requireOpenCycle(ctx, userId, cycleId)
  const settings = await requireSettings(ctx, userId)
  const sourceId = await ctx.db.insert('incomeSources', {
    userId,
    ...values,
    savingsRate: settings.defaultSavingsRate,
    isAnchor: false,
    sortOrder: Date.now(),
    oneOffCycleId: cycle._id,
  })
  await ctx.db.insert('cycleIncomePlans', {
    userId,
    cycleId: cycle._id,
    sourceId,
    sourceName: values.name,
    expectedDayStart: values.expectedDayStart,
    expectedDayEnd: values.expectedDayEnd,
    expectedAmount: values.expectedAmount,
    savingsRate: settings.defaultSavingsRate,
    isAnchor: false,
  })
  return sourceId
}

export async function updateOneOffIncome(
  ctx: MutationCtx,
  userId: string,
  sourceId: Id<'incomeSources'>,
  input: OneOffIncomeInput,
) {
  const values = validateOneOffIncome(input)
  const { source, cycle, plan } = await requireOneOffSource(
    ctx,
    userId,
    sourceId,
  )
  await ctx.db.patch(source._id, values)
  const planValues = {
    sourceName: values.name,
    expectedDayStart: values.expectedDayStart,
    expectedDayEnd: values.expectedDayEnd,
    expectedAmount: values.expectedAmount,
  }
  if (plan) {
    await ctx.db.patch(plan._id, planValues)
  } else {
    await ctx.db.insert('cycleIncomePlans', {
      userId,
      cycleId: cycle._id,
      sourceId: source._id,
      ...planValues,
      savingsRate: source.savingsRate,
      isAnchor: false,
    })
  }
}

/**
 * Income already linked to the line keeps its link to the archived source and
 * simply counts as unplanned income, so expected income never drops below
 * what arrived.
 */
export async function removeOneOffIncome(
  ctx: MutationCtx,
  userId: string,
  sourceId: Id<'incomeSources'>,
) {
  const { source, plan } = await requireOneOffSource(ctx, userId, sourceId)
  if (plan) await ctx.db.delete(plan._id)
  const linked = await ctx.db
    .query('transactions')
    .withIndex('by_user_and_type_and_time', (q) =>
      q.eq('userId', userId).eq('type', 'income'),
    )
    .filter((q) => q.eq(q.field('sourceId'), source._id))
    .first()
  if (linked) {
    await ctx.db.patch(source._id, { archivedAt: Date.now() })
  } else {
    await ctx.db.delete(source._id)
  }
}

/**
 * Records a reconcile gap on an investment account as income for the cycle.
 * Unlike a balance adjustment it counts as income; the account stays outside
 * free to spend, so no auto-save is proposed for it.
 */
export async function logInvestmentReturn(
  ctx: MutationCtx,
  userId: string,
  args: { accountId: Id<'accounts'>; actual: number; note?: string },
) {
  const account = await requireActiveAccount(ctx, userId, args.accountId)
  if (isSpendableAccount(account)) {
    throw new ConvexError(
      'Only accounts outside free to spend can log an investment return',
    )
  }
  const delta = args.actual - account.balance
  if (!Number.isFinite(delta) || delta <= 0) {
    throw new ConvexError(
      'A return needs a real balance higher than the one in Misi',
    )
  }

  let fxRate: number | undefined
  let canonicalAmount = roundMoney(delta)
  if (account.currency === 'USD') {
    fxRate = (await requireSettings(ctx, userId)).usdRate
    canonicalAmount = currencyToMwk(delta, 'USD', fxRate)
  }
  assertPositiveAmount(canonicalAmount)
  const cycle = await ensureCurrentCycle(ctx, userId)
  const transactionId = await insertTransaction(ctx, userId, {
    userId,
    cycleId: cycle._id,
    type: 'income',
    amount: canonicalAmount,
    payee: 'Investment return',
    accountId: account._id,
    walletId: 'spending',
    note: args.note,
    excludeFromBudget: false,
    occurredAt: Date.now(),
    ...(fxRate !== undefined ? { fxRate } : {}),
  })
  await ctx.db.patch(account._id, { balance: args.actual })
  return transactionId
}
