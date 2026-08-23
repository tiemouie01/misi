import {
  checkpointDebtOpeningBalance,
  isBeforeCheckpoint,
} from '../../shared/checkpoints'
import { computeClaimRemaining } from '../../shared/claim'
import { foldSavingsBalance } from '../../shared/savings'
import { getSettings, toClaimMovement, toSavingsMovement } from './core'

import type { WithoutSystemFields } from 'convex/server'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import type { ReadCtx } from './core'

/** The newest checkpoint that is still in the past. */
export async function latestCheckpoint(ctx: ReadCtx, userId: string) {
  return await ctx.db
    .query('cycleCheckpoints')
    .withIndex('by_user_and_as_of', (q) =>
      q.eq('userId', userId).lte('asOf', Date.now()),
    )
    .order('desc')
    .first()
}

/**
 * Resolves the checkpoint a balance read should resume from. When the read
 * excludes a transaction that the checkpoint already summarizes (it occurred
 * strictly before `asOf`), no checkpoint applies and the caller must fold the
 * full history instead. Pass `checkpoint` to reuse an already-fetched one;
 * `null` means "fold from the beginning".
 */
export async function resolveCheckpointForRead(
  ctx: ReadCtx,
  userId: string,
  excludeTransactionId?: Id<'transactions'>,
  checkpoint?: Doc<'cycleCheckpoints'> | null,
) {
  const resolved =
    checkpoint === undefined ? await latestCheckpoint(ctx, userId) : checkpoint
  if (!resolved || !excludeTransactionId) return resolved

  const excluded = await ctx.db.get(excludeTransactionId)
  if (
    excluded?.userId === userId &&
    isBeforeCheckpoint(resolved.asOf, excluded.occurredAt)
  ) {
    return null
  }
  return resolved
}

/** The newest checkpoint strictly older than `asOf`. */
async function checkpointBefore(
  ctx: MutationCtx,
  userId: string,
  asOf: number,
) {
  return await ctx.db
    .query('cycleCheckpoints')
    .withIndex('by_user_and_as_of', (q) =>
      q.eq('userId', userId).lt('asOf', asOf),
    )
    .order('desc')
    .first()
}

/**
 * Freezes the running money totals as they stood the instant `cycle` began,
 * resuming from the previous checkpoint so a rollover only ever folds one
 * cycle's worth of movements.
 */
async function writeCheckpointForCycle(
  ctx: MutationCtx,
  userId: string,
  cycle: Doc<'cycles'>,
) {
  const settings = await getSettings(ctx, userId)
  if (!settings) return

  const [existing, previous, debts] = await Promise.all([
    ctx.db
      .query('cycleCheckpoints')
      .withIndex('by_user_and_cycle', (q) =>
        q.eq('userId', userId).eq('cycleId', cycle._id),
      )
      .first(),
    checkpointBefore(ctx, userId, cycle.startsAt),
    ctx.db
      .query('debts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  ])
  const from = previous?.asOf

  const transactions = await ctx.db
    .query('transactions')
    .withIndex('by_user_and_time', (q) => {
      const scoped = q.eq('userId', userId)
      return from === undefined
        ? scoped.lt('occurredAt', cycle.startsAt)
        : scoped.gte('occurredAt', from).lt('occurredAt', cycle.startsAt)
    })
    .collect()
  const savingsMovements = transactions.filter(
    (transaction) => transaction.walletId === 'savings',
  )
  const claimsByDebt = new Map<Id<'debts'>, Array<Doc<'transactions'>>>()
  for (const transaction of transactions) {
    if (transaction.type !== 'claim' || !transaction.debtId) continue
    const claims = claimsByDebt.get(transaction.debtId) ?? []
    claims.push(transaction)
    claimsByDebt.set(transaction.debtId, claims)
  }

  const debtRemaining = debts.map((debt) => {
    const openingBalance = checkpointDebtOpeningBalance(
      previous?.debtRemaining ?? [],
      debt._id,
      debt.openingBalance,
    )
    return {
      debtId: debt._id,
      remaining: computeClaimRemaining(
        openingBalance,
        (claimsByDebt.get(debt._id) ?? []).map(toClaimMovement),
      ),
    }
  })

  const value = {
    userId,
    cycleId: cycle._id,
    asOf: cycle.startsAt,
    savingsBalance: foldSavingsBalance(
      previous?.savingsBalance ?? settings.savingsOpeningBalance,
      savingsMovements.map(toSavingsMovement),
    ),
    debtRemaining,
  }

  if (existing) {
    await ctx.db.patch(existing._id, value)
  } else {
    await ctx.db.insert('cycleCheckpoints', value)
  }
}

/** Creates a cycle checkpoint once, then leaves the immutable memo untouched. */
export async function ensureCheckpointForCycle(
  ctx: MutationCtx,
  userId: string,
  cycle: Doc<'cycles'>,
) {
  const existing = await ctx.db
    .query('cycleCheckpoints')
    .withIndex('by_user_and_cycle', (q) =>
      q.eq('userId', userId).eq('cycleId', cycle._id),
    )
    .first()
  if (!existing) {
    await writeCheckpointForCycle(ctx, userId, cycle)
  }
}

/**
 * A checkpoint only summarises transactions that occurred strictly before its
 * `asOf`, so writing a transaction older than one makes it a lie. Dropping it
 * is always safe: readers fall back to folding the full history.
 */
async function invalidateCheckpointsFrom(
  ctx: MutationCtx,
  userId: string,
  occurredAt: number,
) {
  const stale = await ctx.db
    .query('cycleCheckpoints')
    .withIndex('by_user_and_as_of', (q) =>
      q.eq('userId', userId).gt('asOf', occurredAt),
    )
    .collect()
  for (const checkpoint of stale) {
    await ctx.db.delete(checkpoint._id)
  }
}

/** For changes that rewrite history wholesale, such as a debt's opening balance. */
export async function invalidateAllCheckpoints(
  ctx: MutationCtx,
  userId: string,
) {
  const all = await ctx.db
    .query('cycleCheckpoints')
    .withIndex('by_user_and_as_of', (q) => q.eq('userId', userId))
    .collect()
  for (const checkpoint of all) {
    await ctx.db.delete(checkpoint._id)
  }
}

/**
 * Every transaction write goes through these three helpers, which is what keeps
 * the checkpoint invariant enforceable in one place. Do not call
 * ctx.db.insert/patch/delete on `transactions` directly.
 */
export async function insertTransaction(
  ctx: MutationCtx,
  userId: string,
  document: WithoutSystemFields<Doc<'transactions'>>,
) {
  await invalidateCheckpointsFrom(ctx, userId, document.occurredAt)
  return await ctx.db.insert('transactions', document)
}

export async function patchTransaction(
  ctx: MutationCtx,
  userId: string,
  transaction: Doc<'transactions'>,
  patch: Partial<WithoutSystemFields<Doc<'transactions'>>>,
) {
  await invalidateCheckpointsFrom(
    ctx,
    userId,
    Math.min(
      transaction.occurredAt,
      patch.occurredAt ?? transaction.occurredAt,
    ),
  )
  await ctx.db.patch(transaction._id, patch)
  return transaction._id
}

export async function removeTransaction(
  ctx: MutationCtx,
  userId: string,
  transaction: Doc<'transactions'>,
) {
  await invalidateCheckpointsFrom(ctx, userId, transaction.occurredAt)
  await ctx.db.delete(transaction._id)
  return transaction._id
}
