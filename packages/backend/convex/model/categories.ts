import {
  CATEGORY_COLOR_IDS,
  CATEGORY_ICON_IDS,
  DEFAULT_CATEGORIES,
} from '../categories'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import type { ReadCtx } from './core'

export async function getCategories(ctx: ReadCtx, userId: string) {
  const categories = await ctx.db
    .query('categories')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  return categories.sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function isCategoryReferenced(
  ctx: ReadCtx,
  userId: string,
  categoryKey: string,
) {
  const [transaction, budget] = await Promise.all([
    ctx.db
      .query('transactions')
      .withIndex('by_user_and_category', (q) =>
        q.eq('userId', userId).eq('categoryId', categoryKey),
      )
      .first(),
    ctx.db
      .query('budgets')
      .withIndex('by_user_and_category', (q) =>
        q.eq('userId', userId).eq('categoryId', categoryKey),
      )
      .first(),
  ])
  return transaction !== null || budget !== null
}

export async function getCategoriesWithReferences(
  ctx: ReadCtx,
  userId: string,
) {
  const categories = await getCategories(ctx, userId)
  return await Promise.all(
    categories.map(async (category) => ({
      ...category,
      referenced: await isCategoryReferenced(ctx, userId, category.key),
    })),
  )
}

export async function seedDefaultCategoriesForUser(
  ctx: MutationCtx,
  userId: string,
) {
  const existing = await ctx.db
    .query('categories')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
  if (existing) return false

  for (const [sortOrder, category] of DEFAULT_CATEGORIES.entries()) {
    await ctx.db.insert('categories', {
      userId,
      ...category,
      sortOrder,
    })
  }
  return true
}

export function validateCategoryName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Category name cannot be empty')
  return trimmed
}

export function validateCategoryIcon(icon: string) {
  if (!(CATEGORY_ICON_IDS as readonly string[]).includes(icon)) {
    throw new Error('Choose a valid category icon')
  }
}

export function validateCategoryColor(color: string) {
  if (!(CATEGORY_COLOR_IDS as readonly string[]).includes(color)) {
    throw new Error('Choose a valid category color')
  }
}

export async function assertUniqueCategoryName(
  ctx: ReadCtx,
  userId: string,
  name: string,
  excludeId?: Id<'categories'>,
) {
  const categories = await getCategories(ctx, userId)
  const duplicate = categories.some(
    (category) =>
      category._id !== excludeId &&
      category.archivedAt === undefined &&
      category.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw new Error('A category with this name already exists')
}

export async function requireOwnedCategory(
  ctx: ReadCtx,
  userId: string,
  id: Id<'categories'>,
) {
  const category = await ctx.db.get(id)
  if (!category || category.userId !== userId) {
    throw new Error('Category not found')
  }
  return category
}
