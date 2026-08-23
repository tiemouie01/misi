import { foldSavingsBalance } from '../../shared/savings'
import { resolveCheckpointForRead } from './checkpoints'
import { requireSettings, toSavingsMovement } from './core'

import type { Doc, Id } from '../_generated/dataModel'
import type { ReadCtx } from './core'

export function isSpendableAccount(account: Doc<'accounts'>) {
  return account.includeInSpendable ?? account.kind !== 'investment'
}

export function computeSpendableTotalMwk(
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

/** Savings-wallet transactions from `since` onward, or all of them if unset. */
async function savingsMovementsSince(
  ctx: ReadCtx,
  userId: string,
  since?: number,
) {
  return await ctx.db
    .query('transactions')
    .withIndex('by_user_and_wallet_and_time', (q) => {
      const scoped = q.eq('userId', userId).eq('walletId', 'savings')
      return since === undefined ? scoped : scoped.gte('occurredAt', since)
    })
    .collect()
}

/**
 * Resumes from the most recent checkpoint so a long-lived account does not
 * re-fold its entire savings history on every read. With no checkpoint this is
 * exactly the original full fold.
 */
export async function computeSavingsBalance(
  ctx: ReadCtx,
  userId: string,
  settings: Doc<'settings'>,
  excludeTransactionId?: Id<'transactions'>,
  checkpoint?: Doc<'cycleCheckpoints'> | null,
) {
  const resolvedCheckpoint = await resolveCheckpointForRead(
    ctx,
    userId,
    excludeTransactionId,
    checkpoint,
  )
  const movements = await savingsMovementsSince(
    ctx,
    userId,
    resolvedCheckpoint?.asOf,
  )
  return foldSavingsBalance(
    resolvedCheckpoint?.savingsBalance ?? settings.savingsOpeningBalance,
    movements.map(toSavingsMovement),
    excludeTransactionId,
  )
}

export async function assertSavingsHasAmount(
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
