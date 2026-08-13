import { internalMutation } from './_generated/server'

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
