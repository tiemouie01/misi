import {
  assertDebtClaimMutable,
  claimActionMatchesDirection,
  claimAllowsFromSavings,
  claimForbidsAccount,
  claimRequiresAccount,
} from '../../shared/claim'
import {
  accountBalanceImpacts,
  assertUsdRate,
  roundMoney,
} from '../../shared/fx'
import { getCategories } from './categories'
import {
  assertPositiveAmount,
  requireOwnedAccount,
  requireSettings,
} from './core'
import { requireOwnedDebt } from './debts'

import type { AdjustPolarity, ClaimAction } from '../../shared/claim'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import type { ReadCtx } from './core'

export type TransactionInput = {
  type: Doc<'transactions'>['type']
  amount: number
  categoryId?: string
  accountId?: Id<'accounts'>
  toAccountId?: Id<'accounts'>
  sourceId?: Id<'incomeSources'>
  debtId?: Id<'debts'>
  claimAction?: ClaimAction
  adjustPolarity?: AdjustPolarity
  excludeFromBudget?: boolean
  fxRate?: number
}

function assertFromSavingsType(
  type: Doc<'transactions'>['type'],
  fromSavings: boolean | undefined,
  claimAction?: ClaimAction,
) {
  if (!fromSavings) return
  if (type === 'expense' || type === 'transfer') return
  if (type === 'claim' && claimAction && claimAllowsFromSavings(claimAction)) {
    return
  }
  throw new Error(
    'Savings spending is only valid for expenses, transfers, and debt repayments or loans',
  )
}

export function resolveEnvelopeFields(
  type: Doc<'transactions'>['type'],
  fromSavings: boolean | undefined,
  excludeFromBudget: boolean | undefined,
  claimAction?: ClaimAction,
) {
  assertFromSavingsType(type, fromSavings, claimAction)
  return {
    walletId: fromSavings ? 'savings' : 'spending',
    excludeFromBudget:
      fromSavings && type === 'expense' ? true : (excludeFromBudget ?? false),
  }
}

export async function requireOwnedTransaction(
  ctx: ReadCtx,
  userId: string,
  transactionId: Id<'transactions'>,
) {
  const transaction = await ctx.db.get(transactionId)

  if (!transaction || transaction.userId !== userId) {
    throw new Error('Transaction not found')
  }

  return transaction
}

export async function assertMutableUserTransaction(
  ctx: ReadCtx,
  transaction: Doc<'transactions'>,
  action: 'edited' | 'deleted',
) {
  if (transaction.adjustment) {
    throw new Error(`Generated transactions cannot be ${action}`)
  }
  if (transaction.type === 'allocation') {
    throw new Error(`Generated transactions cannot be ${action}`)
  }

  if (transaction.type === 'claim' && transaction.debtId) {
    const debt = await requireOwnedDebt(
      ctx,
      transaction.userId,
      transaction.debtId,
    )
    assertDebtClaimMutable(debt.archivedAt, action)
  }

  if (transaction.type !== 'income' || action === 'edited') return

  const autoSaveEvent = await ctx.db
    .query('autoSaveEvents')
    .withIndex('by_transaction', (q) => q.eq('transactionId', transaction._id))
    .first()
  if (autoSaveEvent) {
    throw new Error(
      `Income with a handled savings proposal cannot be ${action}`,
    )
  }
}

/**
 * Income whose savings proposal was confirmed or dismissed stays editable
 * (source, account, payee, date, amount), but it must remain income and cannot
 * drop below a confirmed auto-save, so the Savings move it funded stays valid.
 */
export async function assertHandledIncomeEdit(
  ctx: ReadCtx,
  transaction: Doc<'transactions'>,
  next: { type: Doc<'transactions'>['type']; amount: number },
) {
  if (transaction.type !== 'income') return

  const autoSaveEvent = await ctx.db
    .query('autoSaveEvents')
    .withIndex('by_transaction', (q) => q.eq('transactionId', transaction._id))
    .first()
  if (!autoSaveEvent) return
  if (next.type !== 'income') {
    throw new Error('Income with a handled savings proposal must stay income')
  }
  if (
    autoSaveEvent.status === 'confirmed' &&
    next.amount < autoSaveEvent.amount
  ) {
    throw new Error('Income cannot be less than the amount already auto-saved')
  }
}

export async function requireOwnedIncomeTransaction(
  ctx: ReadCtx,
  userId: string,
  transactionId: Id<'transactions'>,
) {
  const transaction = await ctx.db.get(transactionId)

  if (
    !transaction ||
    transaction.userId !== userId ||
    transaction.type !== 'income' ||
    transaction.adjustment
  ) {
    throw new Error('Income transaction not found')
  }

  return transaction
}

export async function assertNoAutoSaveEvent(
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

async function validateClaimInput(
  ctx: ReadCtx,
  userId: string,
  input: TransactionInput,
  options?: { allowArchived?: boolean },
) {
  if (!input.debtId) {
    throw new Error('A debt is required')
  }
  if (!input.claimAction) {
    throw new Error('A claim action is required')
  }
  if (input.categoryId) {
    throw new Error('A category is only valid for expenses')
  }
  if (input.sourceId) {
    throw new Error('sourceId is only valid for income transactions')
  }
  if (input.toAccountId) {
    throw new Error('A destination account is only valid for transfers')
  }
  if (input.claimAction === 'adjust') {
    if (!input.adjustPolarity) {
      throw new Error(
        'Choose whether this adjust increases or decreases the remaining',
      )
    }
  } else if (input.adjustPolarity) {
    throw new Error('Adjust polarity is only valid for adjustments')
  }

  const debt = await requireOwnedDebt(ctx, userId, input.debtId)
  if (debt.archivedAt !== undefined && !options?.allowArchived) {
    throw new Error('Unarchive this debt before logging a movement')
  }
  if (!claimActionMatchesDirection(input.claimAction, debt.direction)) {
    throw new Error('That action does not match this debt')
  }

  if (claimForbidsAccount(input.claimAction) && input.accountId) {
    throw new Error('Adjustments cannot be tied to an account')
  }
  if (claimRequiresAccount(input.claimAction) && !input.accountId) {
    throw new Error('An account is required')
  }
  if (input.accountId) {
    const account = await requireOwnedAccount(ctx, userId, input.accountId)
    if (account.currency !== 'MWK') {
      throw new Error('Debt cash movements can only use MWK accounts')
    }
  }
}

export async function validateTransactionInput(
  ctx: ReadCtx,
  userId: string,
  input: TransactionInput,
  options?: {
    allowArchivedDebt?: boolean
    allowArchivedSourceId?: Id<'incomeSources'>
  },
) {
  assertPositiveAmount(input.amount)

  if (input.type === 'allocation') {
    if (input.accountId) {
      throw new Error('Allocations cannot be tied to an account')
    }
    if (input.toAccountId) {
      throw new Error('A destination account is only valid for transfers')
    }
    if (input.categoryId) {
      throw new Error('A category is only valid for expenses')
    }
    if (input.sourceId) {
      throw new Error('sourceId is only valid for income transactions')
    }
    if (input.debtId || input.claimAction) {
      throw new Error('Allocations cannot be tied to a debt')
    }
    return
  }

  if (input.type === 'claim') {
    await validateClaimInput(ctx, userId, input, {
      allowArchived: options?.allowArchivedDebt,
    })
    return
  }

  if (input.debtId || input.claimAction || input.adjustPolarity) {
    throw new Error('Debt fields are only valid for claim transactions')
  }

  if (!input.accountId) {
    throw new Error('An account is required')
  }
  await requireOwnedAccount(ctx, userId, input.accountId)

  if (input.type === 'expense') {
    if (!input.categoryId) {
      throw new Error('A category is required for expenses')
    }
    const category = (await getCategories(ctx, userId)).find(
      (candidate) => candidate.key === input.categoryId,
    )
    if (!category || category.archivedAt !== undefined) {
      throw new Error('Expense category not found')
    }
  } else if (input.categoryId) {
    throw new Error('A category is only valid for expenses')
  }

  if (input.excludeFromBudget && input.type !== 'expense') {
    throw new Error('Only expenses can be excluded from the spending plan')
  }

  if (input.sourceId) {
    if (input.type !== 'income') {
      throw new Error('sourceId is only valid for income transactions')
    }
    const source = await ctx.db.get(input.sourceId)
    if (
      !source ||
      source.userId !== userId ||
      (source.archivedAt !== undefined &&
        input.sourceId !== options?.allowArchivedSourceId)
    ) {
      throw new Error('Income source not found')
    }
  }

  if (input.type === 'transfer') {
    if (!input.toAccountId) {
      throw new Error('A destination account is required for transfers')
    }
    if (input.toAccountId === input.accountId) {
      throw new Error('Transfer accounts must be different')
    }
    await requireOwnedAccount(ctx, userId, input.toAccountId)
  } else if (input.toAccountId) {
    throw new Error('A destination account is only valid for transfers')
  }
}

async function loadAccountCurrencies(
  ctx: MutationCtx,
  userId: string,
  input: TransactionInput | null,
  currencyByAccountId: Map<string, Doc<'accounts'>['currency']>,
) {
  if (!input) return
  for (const accountId of [input.accountId, input.toAccountId]) {
    if (!accountId || currencyByAccountId.has(accountId)) continue
    const account = await requireOwnedAccount(ctx, userId, accountId)
    currencyByAccountId.set(account._id, account.currency)
  }
}

export async function withCapturedFxRate(
  ctx: ReadCtx,
  userId: string,
  input: TransactionInput,
): Promise<TransactionInput> {
  if (input.fxRate !== undefined) {
    assertUsdRate(input.fxRate)
    return input
  }

  for (const accountId of [input.accountId, input.toAccountId]) {
    if (!accountId) continue
    const account = await requireOwnedAccount(ctx, userId, accountId)
    if (account.currency === 'USD') {
      const settings = await requireSettings(ctx, userId)
      assertUsdRate(settings.usdRate)
      return { ...input, fxRate: settings.usdRate }
    }
  }

  return input
}

function getAccountBalanceImpacts(
  input: TransactionInput,
  currencyByAccountId: Map<string, Doc<'accounts'>['currency']>,
) {
  const impacts = accountBalanceImpacts({
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    toAccountId: input.toAccountId,
    claimAction: input.claimAction,
    currencyByAccountId,
    usdRate: input.fxRate,
  })
  const typed = new Map<Id<'accounts'>, number>()
  for (const [accountId, amount] of impacts) {
    typed.set(accountId as Id<'accounts'>, amount)
  }
  return typed
}

export async function applyTransactionBalanceTransition(
  ctx: MutationCtx,
  userId: string,
  previous: TransactionInput | null,
  next: TransactionInput | null,
) {
  const currencyByAccountId = new Map<string, Doc<'accounts'>['currency']>()
  await loadAccountCurrencies(ctx, userId, previous, currencyByAccountId)
  const nextInput = next ? await withCapturedFxRate(ctx, userId, next) : null
  await loadAccountCurrencies(ctx, userId, nextInput, currencyByAccountId)

  if (previous && previous.fxRate === undefined) {
    const previousTouchesUsd = [previous.accountId, previous.toAccountId].some(
      (accountId) =>
        accountId !== undefined && currencyByAccountId.get(accountId) === 'USD',
    )
    if (previousTouchesUsd) {
      throw new Error(
        'This USD transfer is missing a stored exchange rate. Run the FX repair before editing or deleting it.',
      )
    }
  }

  const changes = new Map<Id<'accounts'>, number>()
  const addChange = (accountId: Id<'accounts'>, amount: number) => {
    changes.set(accountId, (changes.get(accountId) ?? 0) + amount)
  }

  if (previous) {
    for (const [accountId, amount] of getAccountBalanceImpacts(
      previous,
      currencyByAccountId,
    )) {
      addChange(accountId, -amount)
    }
  }
  if (nextInput) {
    for (const [accountId, amount] of getAccountBalanceImpacts(
      nextInput,
      currencyByAccountId,
    )) {
      addChange(accountId, amount)
    }
  }

  for (const [accountId, change] of changes) {
    if (change === 0) continue
    const account = await requireOwnedAccount(ctx, userId, accountId)
    await ctx.db.patch(account._id, {
      balance: roundMoney(account.balance + change),
    })
  }
}
