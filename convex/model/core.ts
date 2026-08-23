import type { SavingsMovement } from '../../shared/savings'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

export type ReadCtx = QueryCtx | MutationCtx

export function assertPositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number')
  }
}

export function assertNonnegativeFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be zero or more`)
  }
}

export async function getSettings(ctx: ReadCtx, userId: string) {
  return await ctx.db
    .query('settings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
}

export async function requireSettings(ctx: ReadCtx, userId: string) {
  const settings = await getSettings(ctx, userId)

  if (!settings) {
    throw new Error('Settings not found; run ensureSeedData first')
  }

  return settings
}

export async function requireOwnedAccount(
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

export function toClaimMovement(transaction: Doc<'transactions'>) {
  if (!transaction.claimAction) {
    throw new Error('Claim transaction is missing an action')
  }
  return {
    id: transaction._id,
    action: transaction.claimAction,
    amount: transaction.amount,
    adjustPolarity: transaction.adjustPolarity,
  }
}

export function toSavingsMovement(
  transaction: Doc<'transactions'>,
): SavingsMovement {
  return {
    id: transaction._id,
    type: transaction.type,
    direction: transaction.direction,
    amount: transaction.amount,
  }
}
