import { ConvexError } from 'convex/values'
import {
  collectBudgetableSeeds,
  seedCycleBudgetsFromPrevious,
  spentByCategory,
} from '../../shared/budget-rollover'
import {
  DEFAULT_PAYDAY_DAY,
  resolveCyclePeriod,
} from '../../shared/cycle-period'
import { ensureCheckpointForCycle } from './checkpoints'
import { assertNonnegativeFinite, getSettings } from './core'
import { getCategories } from './categories'

import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import type { ReadCtx } from './core'

export { DEFAULT_PAYDAY_DAY, getCyclePeriod } from '../../shared/cycle-period'

/**
 * Prefer the newest started cycle that covers now, even if malformed or legacy
 * data contains overlapping ranges. If none covers now, use the newest cycle
 * that has started; the index keeps the common path bounded.
 */
export async function getLatestCycle(ctx: ReadCtx, userId: string) {
  const now = Date.now()
  const startedCycles = () =>
    ctx.db
      .query('cycles')
      .withIndex('by_user_and_start', (q) =>
        q.eq('userId', userId).lte('startsAt', now),
      )
      .order('desc')
  const covering = await startedCycles()
    .filter((q) => q.gte(q.field('endsAt'), now))
    .first()
  return covering ?? (await startedCycles().first())
}

/** One-off income belongs to a single cycle; only recurring sources roll over. */
export function isRecurringIncomeSource(source: Doc<'incomeSources'>) {
  return source.oneOffCycleId === undefined
}

export async function getCycleIncomePlans(
  ctx: ReadCtx,
  userId: string,
  cycleId: Id<'cycles'>,
) {
  return await ctx.db
    .query('cycleIncomePlans')
    .withIndex('by_user_and_cycle', (q) =>
      q.eq('userId', userId).eq('cycleId', cycleId),
    )
    .collect()
}

/**
 * Clears the cycle's recurring income plans so they can be rebuilt from the
 * sources, leaving its one-off lines in place.
 */
export async function deleteRecurringCyclePlans(
  ctx: MutationCtx,
  userId: string,
  cycleId: Id<'cycles'>,
) {
  const [plans, sources] = await Promise.all([
    getCycleIncomePlans(ctx, userId, cycleId),
    ctx.db
      .query('incomeSources')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  ])
  const oneOffIds = new Set(
    sources
      .filter((source) => !isRecurringIncomeSource(source))
      .map((source) => source._id),
  )
  for (const plan of plans) {
    if (!oneOffIds.has(plan.sourceId)) await ctx.db.delete(plan._id)
  }
}

export async function syncCycleIncomePlans(
  ctx: MutationCtx,
  userId: string,
  cycleId: Id<'cycles'>,
) {
  const [existingPlans, allIncomeSources] = await Promise.all([
    getCycleIncomePlans(ctx, userId, cycleId),
    ctx.db
      .query('incomeSources')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  ])
  const incomeSources = allIncomeSources.filter(
    (source) =>
      source.archivedAt === undefined && isRecurringIncomeSource(source),
  )
  const existingSourceIds = new Set(existingPlans.map((plan) => plan.sourceId))
  for (const source of incomeSources) {
    if (existingSourceIds.has(source._id)) continue
    await ctx.db.insert('cycleIncomePlans', {
      userId,
      cycleId,
      sourceId: source._id,
      sourceName: source.name,
      expectedDayStart: source.expectedDayStart,
      expectedDayEnd: source.expectedDayEnd,
      expectedAmount: source.expectedAmount,
      expectedAmountMax: source.expectedAmountMax,
      savingsRate: source.savingsRate,
      isAnchor: source.isAnchor,
    })
  }
}

async function copyCyclePlans(
  ctx: MutationCtx,
  userId: string,
  fromCycleId: Id<'cycles'>,
  toCycleId: Id<'cycles'>,
) {
  const [
    previousBudgets,
    previousIncomePlans,
    previousTransactions,
    categories,
    previousCycle,
  ] = await Promise.all([
    ctx.db
      .query('budgets')
      .withIndex('by_user_and_cycle', (q) =>
        q.eq('userId', userId).eq('cycleId', fromCycleId),
      )
      .collect(),
    getCycleIncomePlans(ctx, userId, fromCycleId),
    ctx.db
      .query('transactions')
      .withIndex('by_user_and_cycle', (q) =>
        q.eq('userId', userId).eq('cycleId', fromCycleId),
      )
      .collect(),
    getCategories(ctx, userId),
    ctx.db.get(fromCycleId),
  ])

  const seededInput = collectBudgetableSeeds({
    categories: categories.map((category) => ({
      key: category.key,
      isSystem: category.isSystem,
      archived: category.archivedAt !== undefined,
    })),
    previousBudgets,
    spentByCategory: spentByCategory(previousTransactions),
  })
  const seeded = seedCycleBudgetsFromPrevious({
    ...seededInput,
    previousSpendingLimit: previousCycle?.spendingLimit ?? 0,
  })

  for (const plan of seeded.categoryPlans) {
    await ctx.db.insert('budgets', {
      userId,
      cycleId: toCycleId,
      categoryId: plan.categoryId,
      plannedAmount: plan.plannedAmount,
    })
  }
  await ctx.db.patch(toCycleId, { spendingLimit: seeded.spendingLimit })

  for (const plan of previousIncomePlans) {
    const source = await ctx.db.get(plan.sourceId)
    if (
      !source ||
      source.userId !== userId ||
      source.archivedAt !== undefined ||
      !isRecurringIncomeSource(source)
    ) {
      continue
    }
    await ctx.db.insert('cycleIncomePlans', {
      userId,
      cycleId: toCycleId,
      sourceId: plan.sourceId,
      sourceName: source.name,
      expectedDayStart: source.expectedDayStart,
      expectedDayEnd: source.expectedDayEnd,
      expectedAmount: plan.expectedAmount,
      expectedAmountMax: plan.expectedAmountMax,
      savingsRate: plan.savingsRate,
      isAnchor: source.isAnchor,
    })
  }
}

/**
 * The cycle a movement dated `occurredAt` belongs to. An existing cycle that
 * covers the date always wins, even when it no longer matches the payday (a
 * payday change only takes effect from the next cycle). Otherwise a new cycle
 * is created after the latest one that started before the date, without
 * overlapping it or any later cycle.
 */
export async function ensureCycleForDate(
  ctx: MutationCtx,
  userId: string,
  occurredAt: number,
) {
  if (!Number.isFinite(occurredAt)) {
    throw new Error('Transaction date must be a finite number')
  }
  const startedCycles = () =>
    ctx.db
      .query('cycles')
      .withIndex('by_user_and_start', (q) =>
        q.eq('userId', userId).lte('startsAt', occurredAt),
      )
      .order('desc')
  const coveringCycle = await startedCycles()
    .filter((q) => q.gte(q.field('endsAt'), occurredAt))
    .first()
  if (coveringCycle) {
    await ensureCheckpointForCycle(ctx, userId, coveringCycle)
    return coveringCycle
  }

  const [settings, previousCycle, nextCycle] = await Promise.all([
    getSettings(ctx, userId),
    startedCycles().first(),
    ctx.db
      .query('cycles')
      .withIndex('by_user_and_start', (q) =>
        q.eq('userId', userId).gt('startsAt', occurredAt),
      )
      .first(),
  ])
  const period = resolveCyclePeriod(
    occurredAt,
    settings?.paydayDay ?? DEFAULT_PAYDAY_DAY,
    previousCycle,
  )
  const cycleId = await ctx.db.insert('cycles', {
    userId,
    ...period,
    endsAt: nextCycle
      ? Math.min(period.endsAt, nextCycle.startsAt - 1)
      : period.endsAt,
    spendingLimit: previousCycle?.spendingLimit ?? 0,
  })

  if (previousCycle) {
    await copyCyclePlans(ctx, userId, previousCycle._id, cycleId)
  }

  const cycle = await ctx.db.get(cycleId)

  if (!cycle) {
    throw new Error('Failed to create cycle')
  }

  await syncCycleIncomePlans(ctx, userId, cycle._id)
  await ensureCheckpointForCycle(ctx, userId, cycle)
  return cycle
}

export async function ensureCurrentCycle(ctx: MutationCtx, userId: string) {
  return await ensureCycleForDate(ctx, userId, Date.now())
}

export async function requireOwnedCycle(
  ctx: ReadCtx,
  userId: string,
  cycleId: Id<'cycles'>,
) {
  const cycle = await ctx.db.get(cycleId)
  if (!cycle || cycle.userId !== userId) {
    throw new Error('Cycle not found')
  }
  return cycle
}

export type CategoryPlanInput = {
  categoryId: string
  plannedAmount: number
}

export type CycleIncomePlanInput = {
  sourceId: Id<'incomeSources'>
  expectedAmount: number
  expectedAmountMax?: number
  savingsRate: number
}

export async function validateCategoryPlans(
  ctx: ReadCtx,
  userId: string,
  plans: Array<CategoryPlanInput>,
) {
  const categories = await getCategories(ctx, userId)
  const categoriesByKey = new Map(
    categories.map((category) => [category.key, category]),
  )
  const seen = new Set<string>()
  for (const plan of plans) {
    assertNonnegativeFinite(plan.plannedAmount, 'Planned amount')
    if (seen.has(plan.categoryId)) {
      throw new Error(`Duplicate category plan: ${plan.categoryId}`)
    }
    seen.add(plan.categoryId)
    const category = categoriesByKey.get(plan.categoryId)
    if (!category || category.archivedAt !== undefined) {
      throw new Error(`Category not found: ${plan.categoryId}`)
    }
  }
}

export function assertCategoryPlansFitLimit(
  plans: Array<CategoryPlanInput>,
  spendingLimit: number,
) {
  const total = plans.reduce((sum, plan) => sum + plan.plannedAmount, 0)
  if (total > spendingLimit) {
    throw new ConvexError(
      'Category plans cannot add up to more than the spending limit',
    )
  }
}

export async function validateCycleIncomePlans(
  ctx: ReadCtx,
  userId: string,
  plans: Array<CycleIncomePlanInput>,
) {
  const seen = new Set<Id<'incomeSources'>>()
  for (const plan of plans) {
    assertNonnegativeFinite(plan.expectedAmount, 'Expected income amount')
    if (
      plan.expectedAmountMax !== undefined &&
      (!Number.isFinite(plan.expectedAmountMax) ||
        plan.expectedAmountMax < plan.expectedAmount)
    ) {
      throw new ConvexError(
        'Maximum expected income must be at least the expected amount',
      )
    }
    if (
      !Number.isFinite(plan.savingsRate) ||
      plan.savingsRate < 0 ||
      plan.savingsRate > 1
    ) {
      throw new ConvexError('Savings rate must be between 0% and 100%')
    }
    if (seen.has(plan.sourceId)) {
      throw new Error(`Duplicate income plan: ${plan.sourceId}`)
    }
    seen.add(plan.sourceId)
    const source = await ctx.db.get(plan.sourceId)
    if (
      !source ||
      source.userId !== userId ||
      source.archivedAt !== undefined ||
      !isRecurringIncomeSource(source)
    ) {
      throw new Error('Income source not found')
    }
  }
}
