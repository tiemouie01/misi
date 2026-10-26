import { ConvexError } from 'convex/values'

import { requireActiveAccount } from './accounts'
import { requireSettings } from './core'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

export type SettingsValues = {
  usdRate?: number
  defaultSavingsRate?: number
  paydayDay?: number
}

export type SettingsUpdate = SettingsValues & {
  defaultExpenseAccountId?: Id<'accounts'>
  defaultTransferFromAccountId?: Id<'accounts'>
  defaultTransferToAccountId?: Id<'accounts'>
}

/** Shared by onboarding and the settings page; skips fields left out. */
export function validateSettingsValues(values: SettingsValues) {
  if (
    values.paydayDay !== undefined &&
    (!Number.isInteger(values.paydayDay) ||
      values.paydayDay < 1 ||
      values.paydayDay > 28)
  ) {
    throw new ConvexError(
      'Payday must be between day 1 and day 28 of the month',
    )
  }
  if (
    values.usdRate !== undefined &&
    (!Number.isFinite(values.usdRate) || values.usdRate <= 0)
  ) {
    throw new ConvexError('Enter a USD rate greater than zero')
  }
  if (
    values.defaultSavingsRate !== undefined &&
    (!Number.isFinite(values.defaultSavingsRate) ||
      values.defaultSavingsRate < 0 ||
      values.defaultSavingsRate > 1)
  ) {
    throw new ConvexError('Savings rate must be between 0% and 100%')
  }
}

/**
 * Patches only the fields given. A new payday leaves existing cycles alone;
 * the next cycle created picks it up (see resolveCyclePeriod).
 */
export async function updateSettings(
  ctx: MutationCtx,
  userId: string,
  update: SettingsUpdate,
) {
  validateSettingsValues(update)
  for (const accountId of [
    update.defaultExpenseAccountId,
    update.defaultTransferFromAccountId,
    update.defaultTransferToAccountId,
  ]) {
    if (accountId) await requireActiveAccount(ctx, userId, accountId)
  }
  const settings = await requireSettings(ctx, userId)
  // Mutation args never carry explicit undefineds (they are dropped on the
  // wire), so only the fields the caller sent are patched.
  await ctx.db.patch(settings._id, update)
}
