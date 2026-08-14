import { mwkToCurrency, roundMoney } from '../shared/fx'
import { internalMutation } from './_generated/server'

import type { Doc, Id } from './_generated/dataModel'

export const repairSavingsPhantomDebits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const transactions = await ctx.db.query('transactions').collect()
    let converted = 0
    let creditedTotal = 0

    for (const transaction of transactions) {
      if (
        transaction.type !== 'transfer' ||
        transaction.walletId !== 'savings' ||
        transaction.toAccountId !== undefined
      ) {
        continue
      }

      if (transaction.accountId) {
        const account = await ctx.db.get(transaction.accountId)
        if (account) {
          await ctx.db.patch(account._id, {
            balance: account.balance + transaction.amount,
          })
          creditedTotal += transaction.amount
        }
      }

      await ctx.db.patch(transaction._id, {
        type: 'allocation',
        direction: 'toSavings',
        accountId: undefined,
      })
      converted++
    }

    return { converted, creditedTotal }
  },
})

/** One-off: undo MWK-sized debits on USD accounts from pre-FX transfers. Delete after running. */
export const repairLegacyUsdTransfers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const transactions = await ctx.db.query('transactions').collect()
    const settingsByUser = new Map<string, number>()
    const usdCorrections = new Map<Id<'accounts'>, number>()
    let repaired = 0

    for (const transaction of transactions) {
      if (transaction.fxRate !== undefined) continue
      if (transaction.adjustment) continue
      if (transaction.type === 'allocation') continue
      if (!transaction.accountId) continue

      const fromAccount = await ctx.db.get(transaction.accountId)
      if (!fromAccount) continue
      const toAccount = transaction.toAccountId
        ? await ctx.db.get(transaction.toAccountId)
        : null
      if (transaction.type === 'transfer' && !toAccount) continue

      const legs: Array<{ account: Doc<'accounts'>; sign: 1 | -1 }> = []
      if (transaction.type === 'expense' && fromAccount.currency === 'USD') {
        legs.push({ account: fromAccount, sign: -1 })
      } else if (
        transaction.type === 'income' &&
        fromAccount.currency === 'USD'
      ) {
        legs.push({ account: fromAccount, sign: 1 })
      } else if (transaction.type === 'transfer' && toAccount) {
        if (fromAccount.currency === 'USD') {
          legs.push({ account: fromAccount, sign: -1 })
        }
        if (toAccount.currency === 'USD') {
          legs.push({ account: toAccount, sign: 1 })
        }
      }
      if (legs.length === 0) continue

      let usdRate = settingsByUser.get(transaction.userId)
      if (usdRate === undefined) {
        const settings = await ctx.db
          .query('settings')
          .withIndex('by_user', (q) => q.eq('userId', transaction.userId))
          .unique()
        if (!settings) continue
        usdRate = settings.usdRate
        settingsByUser.set(transaction.userId, usdRate)
      }

      for (const { account, sign } of legs) {
        if (account.currency !== 'USD') continue
        const applied = sign * transaction.amount
        const correct = sign * mwkToCurrency(transaction.amount, 'USD', usdRate)
        const delta = roundMoney(correct - applied)
        usdCorrections.set(
          account._id,
          (usdCorrections.get(account._id) ?? 0) + delta,
        )
      }

      await ctx.db.patch(transaction._id, { fxRate: usdRate })
      repaired++
    }

    for (const [accountId, delta] of usdCorrections) {
      if (delta === 0) continue
      const account = await ctx.db.get(accountId)
      if (!account) continue
      await ctx.db.patch(account._id, {
        balance: roundMoney(account.balance + delta),
      })
    }

    return { repaired, accountsCorrected: usdCorrections.size }
  },
})
