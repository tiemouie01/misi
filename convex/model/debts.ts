import { checkpointDebtOpeningBalance } from '../../shared/checkpoints'
import { computeClaimRemaining } from '../../shared/claim'
import { resolveCheckpointForRead } from './checkpoints'
import { toClaimMovement } from './core'

import type { AdjustPolarity, ClaimAction } from '../../shared/claim'
import type { Doc, Id } from '../_generated/dataModel'
import type { ReadCtx } from './core'

export function validateDebtName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Every debt needs a name')
  return trimmed
}

export async function assertUniqueDebtName(
  ctx: ReadCtx,
  userId: string,
  name: string,
  excludeId?: Id<'debts'>,
) {
  const debts = await ctx.db
    .query('debts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  const duplicate = debts.some(
    (debt) =>
      debt._id !== excludeId &&
      debt.archivedAt === undefined &&
      debt.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw new Error(`A debt named ${name} already exists`)
}

export async function requireOwnedDebt(
  ctx: ReadCtx,
  userId: string,
  debtId: Id<'debts'>,
) {
  const debt = await ctx.db.get(debtId)
  if (!debt || debt.userId !== userId) {
    throw new Error('Debt not found')
  }
  return debt
}

export async function getClaimMovements(
  ctx: ReadCtx,
  userId: string,
  debtId: Id<'debts'>,
  since?: number,
) {
  const movements = await ctx.db
    .query('transactions')
    .withIndex('by_user_and_debt_and_time', (q) => {
      const scoped = q.eq('userId', userId).eq('debtId', debtId)
      return since === undefined ? scoped : scoped.gte('occurredAt', since)
    })
    .collect()
  return movements.filter((transaction) => transaction.type === 'claim')
}

/**
 * Same shape as computeSavingsBalance: resume from the checkpoint's remaining
 * for this debt rather than replaying every claim ever made against it. A debt
 * created after the checkpoint has no entry, and its opening balance is already
 * the correct starting point.
 */
export async function computeDebtRemaining(
  ctx: ReadCtx,
  userId: string,
  debt: Doc<'debts'>,
  excludeTransactionId?: Id<'transactions'>,
  replacement?: {
    action: ClaimAction
    amount: number
    adjustPolarity?: AdjustPolarity
  },
  checkpoint?: Doc<'cycleCheckpoints'> | null,
) {
  const resolvedCheckpoint = await resolveCheckpointForRead(
    ctx,
    userId,
    excludeTransactionId,
    checkpoint,
  )
  const openingBalance = checkpointDebtOpeningBalance(
    resolvedCheckpoint?.debtRemaining ?? [],
    debt._id,
    debt.openingBalance,
  )
  const movements = (
    await getClaimMovements(ctx, userId, debt._id, resolvedCheckpoint?.asOf)
  ).map(toClaimMovement)
  const remaining = computeClaimRemaining(
    openingBalance,
    movements,
    excludeTransactionId,
  )
  if (!replacement) return remaining
  return (
    Math.round(
      (remaining +
        computeClaimRemaining(0, [
          {
            action: replacement.action,
            amount: replacement.amount,
            adjustPolarity: replacement.adjustPolarity,
          },
        ])) *
        100,
    ) / 100
  )
}

export function assertRemainingNonNegative(remaining: number) {
  if (remaining < 0) {
    throw new Error('This would take the remaining below zero')
  }
}

export async function presentDebt(
  ctx: ReadCtx,
  userId: string,
  debt: Doc<'debts'>,
  checkpoint?: Doc<'cycleCheckpoints'> | null,
) {
  const remaining = await computeDebtRemaining(
    ctx,
    userId,
    debt,
    undefined,
    undefined,
    checkpoint,
  )
  return {
    _id: debt._id,
    name: debt.name,
    direction: debt.direction,
    openingBalance: debt.openingBalance,
    remaining,
    archivedAt: debt.archivedAt,
    sortOrder: debt.sortOrder,
  }
}
