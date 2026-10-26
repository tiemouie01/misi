import { ConvexError } from 'convex/values'

import { getSettings, requireOwnedAccount } from './core'

import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import type { ReadCtx } from './core'

export type AccountKind = Doc<'accounts'>['kind']

export function validateAccountName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new ConvexError('Every account needs a name')
  return trimmed
}

export async function getAccounts(ctx: ReadCtx, userId: string) {
  return await ctx.db
    .query('accounts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
}

/** Names are unique per user, case-insensitively, archived accounts included. */
export function findAccountNamed(
  accounts: Array<Doc<'accounts'>>,
  name: string,
  excludeId?: Id<'accounts'>,
) {
  const key = name.toLowerCase()
  return accounts.find(
    (account) =>
      account._id !== excludeId && account.name.toLowerCase() === key,
  )
}

/**
 * An owned account that a money movement may reference. Archived accounts are
 * rejected unless `allowArchivedId` names it, which lets an edit keep the
 * archived account a transaction already used.
 */
export async function requireActiveAccount(
  ctx: ReadCtx,
  userId: string,
  accountId: Id<'accounts'>,
  allowArchivedId?: Id<'accounts'>,
) {
  const account = await requireOwnedAccount(ctx, userId, accountId)
  if (account.archivedAt !== undefined && account._id !== allowArchivedId) {
    throw new ConvexError('That account is archived')
  }
  return account
}

export async function updateAccount(
  ctx: MutationCtx,
  userId: string,
  accountId: Id<'accounts'>,
  input: { name: string; kind: AccountKind },
) {
  const account = await requireOwnedAccount(ctx, userId, accountId)
  const name = validateAccountName(input.name)
  if (findAccountNamed(await getAccounts(ctx, userId), name, account._id)) {
    throw new ConvexError(`You already have an account named ${name}`)
  }
  await ctx.db.patch(account._id, { name, kind: input.kind })
  return account._id
}

const accountDefaultFields = [
  'defaultExpenseAccountId',
  'defaultTransferFromAccountId',
  'defaultTransferToAccountId',
  'autoSaveSourceAccountId',
] as const

/**
 * Deletes an empty account, or archives it when history still points at it so
 * old transactions keep their account name. Settings defaults that pointed at
 * it are cleared either way.
 */
export async function removeAccount(
  ctx: MutationCtx,
  userId: string,
  accountId: Id<'accounts'>,
): Promise<{ outcome: 'deleted' | 'archived' }> {
  const account = await requireOwnedAccount(ctx, userId, accountId)
  if (account.archivedAt !== undefined) return { outcome: 'archived' }
  // Onboarding rewrites accounts by name and would revive an archived one.
  const settings = await getSettings(ctx, userId)
  if (settings?.onboardedAt === undefined) {
    throw new ConvexError('Finish setting up Misi before removing accounts')
  }
  if (account.balance !== 0) {
    throw new ConvexError(
      'Move or reconcile the remaining balance to zero before removing this account',
    )
  }
  const activeAccounts = (await getAccounts(ctx, userId)).filter(
    (candidate) => candidate.archivedAt === undefined,
  )
  if (activeAccounts.length <= 1) {
    throw new ConvexError('You need at least one account, so add another first')
  }

  const cleared: Partial<
    Record<(typeof accountDefaultFields)[number], undefined>
  > = {}
  for (const field of accountDefaultFields) {
    if (settings[field] === account._id) cleared[field] = undefined
  }
  if (Object.keys(cleared).length > 0) {
    await ctx.db.patch(settings._id, cleared)
  }

  const [fromReference, toReference] = await Promise.all([
    ctx.db
      .query('transactions')
      .withIndex('by_user_and_account', (q) =>
        q.eq('userId', userId).eq('accountId', account._id),
      )
      .first(),
    ctx.db
      .query('transactions')
      .withIndex('by_user_and_to_account', (q) =>
        q.eq('userId', userId).eq('toAccountId', account._id),
      )
      .first(),
  ])
  if (fromReference || toReference) {
    await ctx.db.patch(account._id, { archivedAt: Date.now() })
    return { outcome: 'archived' }
  }
  await ctx.db.delete(account._id)
  return { outcome: 'deleted' }
}

export async function restoreAccount(
  ctx: MutationCtx,
  userId: string,
  accountId: Id<'accounts'>,
) {
  const account = await requireOwnedAccount(ctx, userId, accountId)
  if (account.archivedAt === undefined) return account._id
  const name = validateAccountName(account.name)
  if (findAccountNamed(await getAccounts(ctx, userId), name, account._id)) {
    throw new ConvexError(`You already have an account named ${name}`)
  }
  await ctx.db.patch(account._id, { archivedAt: undefined })
  return account._id
}
