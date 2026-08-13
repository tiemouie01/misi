import { internalMutation } from './_generated/server'

import type { Id } from './_generated/dataModel'

/**
 * One-time backfill for PowerSync uuid / mirror fields.
 * Run once from the Convex dashboard or CLI after deploy:
 *   npx convex run migrations:backfillUuids
 */
export const backfillUuids = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Independent tables first so dependents can resolve mirror uuids.
    const categories = await ctx.db.query('categories').collect()
    for (const doc of categories) {
      if (!doc.uuid) {
        await ctx.db.patch(doc._id, { uuid: crypto.randomUUID() })
      }
    }

    const accounts = await ctx.db.query('accounts').collect()
    const accountUuidById = new Map<Id<'accounts'>, string>()
    for (const doc of accounts) {
      const uuid = doc.uuid ?? crypto.randomUUID()
      if (!doc.uuid) {
        await ctx.db.patch(doc._id, { uuid })
      }
      accountUuidById.set(doc._id, uuid)
    }

    const cycles = await ctx.db.query('cycles').collect()
    const cycleUuidById = new Map<Id<'cycles'>, string>()
    for (const doc of cycles) {
      const uuid = doc.uuid ?? crypto.randomUUID()
      if (!doc.uuid) {
        await ctx.db.patch(doc._id, { uuid })
      }
      cycleUuidById.set(doc._id, uuid)
    }

    const incomeSources = await ctx.db.query('incomeSources').collect()
    const sourceUuidById = new Map<Id<'incomeSources'>, string>()
    for (const doc of incomeSources) {
      const uuid = doc.uuid ?? crypto.randomUUID()
      if (!doc.uuid) {
        await ctx.db.patch(doc._id, { uuid })
      }
      sourceUuidById.set(doc._id, uuid)
    }

    const debts = await ctx.db.query('debts').collect()
    for (const doc of debts) {
      if (!doc.uuid) {
        await ctx.db.patch(doc._id, { uuid: crypto.randomUUID() })
      }
    }

    const budgets = await ctx.db.query('budgets').collect()
    for (const doc of budgets) {
      await ctx.db.patch(doc._id, {
        ...(doc.uuid ? {} : { uuid: crypto.randomUUID() }),
        cycleUuid: cycleUuidById.get(doc.cycleId),
      })
    }

    const cycleIncomePlans = await ctx.db.query('cycleIncomePlans').collect()
    for (const doc of cycleIncomePlans) {
      await ctx.db.patch(doc._id, {
        ...(doc.uuid ? {} : { uuid: crypto.randomUUID() }),
        cycleUuid: cycleUuidById.get(doc.cycleId),
        sourceUuid: sourceUuidById.get(doc.sourceId),
      })
    }

    const transactions = await ctx.db.query('transactions').collect()
    const transactionUuidById = new Map<Id<'transactions'>, string>()
    for (const doc of transactions) {
      const uuid = doc.uuid ?? crypto.randomUUID()
      transactionUuidById.set(doc._id, uuid)
      await ctx.db.patch(doc._id, {
        ...(doc.uuid ? {} : { uuid }),
        cycleUuid: cycleUuidById.get(doc.cycleId),
        accountUuid: accountUuidById.get(doc.accountId),
        ...(doc.toAccountId
          ? { toAccountUuid: accountUuidById.get(doc.toAccountId) }
          : {}),
        ...(doc.sourceId
          ? { sourceUuid: sourceUuidById.get(doc.sourceId) }
          : {}),
      })
    }

    const settingsDocs = await ctx.db.query('settings').collect()
    for (const doc of settingsDocs) {
      await ctx.db.patch(doc._id, {
        ...(doc.uuid ? {} : { uuid: crypto.randomUUID() }),
        ...(doc.autoSaveSourceAccountId
          ? {
              autoSaveSourceAccountUuid: accountUuidById.get(
                doc.autoSaveSourceAccountId,
              ),
            }
          : {}),
        ...(doc.defaultExpenseAccountId
          ? {
              defaultExpenseAccountUuid: accountUuidById.get(
                doc.defaultExpenseAccountId,
              ),
            }
          : {}),
        ...(doc.defaultTransferFromAccountId
          ? {
              defaultTransferFromAccountUuid: accountUuidById.get(
                doc.defaultTransferFromAccountId,
              ),
            }
          : {}),
        ...(doc.defaultTransferToAccountId
          ? {
              defaultTransferToAccountUuid: accountUuidById.get(
                doc.defaultTransferToAccountId,
              ),
            }
          : {}),
      })
    }

    const autoSaveEvents = await ctx.db.query('autoSaveEvents').collect()
    for (const doc of autoSaveEvents) {
      await ctx.db.patch(doc._id, {
        ...(doc.uuid ? {} : { uuid: crypto.randomUUID() }),
        transactionUuid: transactionUuidById.get(doc.transactionId),
      })
    }
  },
})
