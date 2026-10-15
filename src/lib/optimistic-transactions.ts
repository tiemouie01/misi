import { insertAtPosition } from 'convex/react'

import { api } from '../../convex/_generated/api'
import { computeClaimRemaining, sortDebtsByRemaining } from '../../shared/claim'
import { accountBalanceImpacts, roundMoney } from '../../shared/fx'
import { foldSavingsBalance } from '../../shared/savings'

import type { OptimisticLocalStore } from 'convex/browser'
import type { FunctionArgs, FunctionReturnType } from 'convex/server'
import type { Doc, Id } from '../../convex/_generated/dataModel'

type AddTransactionArgs = FunctionArgs<typeof api.misi.addTransaction>
type BootstrapData = NonNullable<FunctionReturnType<typeof api.misi.bootstrap>>

/** Applies the new transaction to each account's balance, as addTransaction does. */
function withBalanceImpacts(
  accounts: BootstrapData['accounts'],
  transaction: Doc<'transactions'>,
) {
  try {
    const impacts = accountBalanceImpacts({
      type: transaction.type,
      amount: transaction.amount,
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId,
      claimAction: transaction.claimAction,
      currencyByAccountId: new Map(
        accounts.map((account) => [account._id, account.currency]),
      ),
      usdRate: transaction.fxRate,
    })
    return accounts.map((account) => {
      const impact = impacts.get(account._id)
      return impact === undefined
        ? account
        : { ...account, balance: roundMoney(account.balance + impact) }
    })
  } catch {
    // Input the server will reject anyway; leave balances to its answer.
    return accounts
  }
}

/**
 * Shows a new transaction in the feed, balances and cycle totals the moment it
 * is submitted, instead of after Convex has run the mutation and re-run every
 * affected query (~0.8s on a phone). Mirrors addTransaction's bookkeeping with
 * the same shared helpers; Convex replaces it with the server's results, or
 * rolls it back if the save fails. Must not throw: that would cancel the save.
 */
export function addTransactionOptimistically(
  localStore: OptimisticLocalStore,
  args: AddTransactionArgs,
) {
  const bootstrap = localStore.getQuery(api.misi.bootstrap, {})
  const settings = bootstrap?.settings
  const cycle = bootstrap?.currentCycle
  if (!bootstrap || !settings || !cycle) return

  const now = Date.now()
  const fromSavings = args.fromSavings === true
  const debt = args.debtId
    ? bootstrap.debts.find((candidate) => candidate._id === args.debtId)
    : undefined
  const touchesUsd = bootstrap.accounts.some(
    (account) =>
      account.currency === 'USD' &&
      (account._id === args.accountId || account._id === args.toAccountId),
  )

  const transaction: Doc<'transactions'> = {
    _id: `optimistic-${now}-${Math.random()}` as Id<'transactions'>,
    _creationTime: now,
    userId: settings.userId,
    cycleId: cycle._id,
    type: args.type,
    amount: args.amount,
    fxRate: touchesUsd ? settings.usdRate : undefined,
    payee: args.type === 'claim' && debt ? debt.name : args.payee,
    categoryId: args.categoryId,
    accountId: args.accountId,
    toAccountId: args.toAccountId,
    debtId: args.debtId,
    claimAction: args.claimAction,
    adjustPolarity: args.adjustPolarity,
    walletId: fromSavings ? 'savings' : 'spending',
    items: args.items,
    note: args.note,
    sourceId: args.sourceId,
    excludeFromBudget:
      fromSavings && args.type === 'expense'
        ? true
        : (args.excludeFromBudget ?? false),
    occurredAt: args.occurredAt ?? now,
  }

  insertAtPosition({
    paginatedQuery: api.misi.listTransactions,
    sortOrder: 'desc',
    sortKeyFromItem: (item) => [item.occurredAt, item._creationTime],
    localQueryStore: localStore,
    item: transaction,
  })

  const inCycle =
    transaction.occurredAt >= cycle.startsAt &&
    transaction.occurredAt <= cycle.endsAt
  const claimAction = transaction.claimAction

  localStore.setQuery(
    api.misi.bootstrap,
    {},
    {
      ...bootstrap,
      accounts: withBalanceImpacts(bootstrap.accounts, transaction),
      transactions: inCycle
        ? [transaction, ...bootstrap.transactions].sort(
            (a, b) => b.occurredAt - a.occurredAt,
          )
        : bootstrap.transactions,
      savingsBalance:
        bootstrap.savingsBalance !== null && fromSavings
          ? foldSavingsBalance(bootstrap.savingsBalance, [transaction])
          : bootstrap.savingsBalance,
      debts:
        debt && claimAction
          ? sortDebtsByRemaining(
              bootstrap.debts.map((candidate) =>
                candidate === debt
                  ? {
                      ...candidate,
                      remaining: computeClaimRemaining(candidate.remaining, [
                        {
                          action: claimAction,
                          amount: transaction.amount,
                          adjustPolarity: transaction.adjustPolarity,
                        },
                      ]),
                    }
                  : candidate,
              ),
            )
          : bootstrap.debts,
    },
  )
}
