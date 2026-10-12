export type PreviousCategoryBudget = {
  categoryId: string
  spent: number
  planned: number
}

export type BudgetableCategory = {
  key: string
  isSystem: boolean
  archived?: boolean
}

export type BudgetExpense = {
  type: string
  amount: number
  categoryId?: string
  excludeFromBudget?: boolean
}

export type SeededCycleBudgets = {
  usedActuals: boolean
  spendingLimit: number
  categoryPlans: Array<{ categoryId: string; plannedAmount: number }>
}

export function roundBudgetAmount(value: number) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0))
}

export function hasPreviousSpend(input: {
  previousActualSpending?: number
  categorySpent?: readonly number[]
}) {
  return (
    roundBudgetAmount(input.previousActualSpending ?? 0) > 0 ||
    (input.categorySpent ?? []).some((spent) => roundBudgetAmount(spent) > 0)
  )
}

export function seedCycleBudgetsFromPrevious(input: {
  categories: readonly PreviousCategoryBudget[]
  previousActualSpending: number
  previousSpendingLimit: number
}): SeededCycleBudgets {
  const usedActuals = hasPreviousSpend({
    previousActualSpending: input.previousActualSpending,
    categorySpent: input.categories.map((category) => category.spent),
  })

  const categoryPlans = input.categories.map((category) => ({
    categoryId: category.categoryId,
    plannedAmount: usedActuals
      ? roundBudgetAmount(category.spent)
      : roundBudgetAmount(category.planned),
  }))
  const categoryTotal = categoryPlans.reduce(
    (sum, plan) => sum + plan.plannedAmount,
    0,
  )

  return {
    usedActuals,
    categoryPlans,
    spendingLimit: usedActuals
      ? categoryTotal
      : Math.max(categoryTotal, roundBudgetAmount(input.previousSpendingLimit)),
  }
}

export function spendingLimitForPlans(
  spendingLimit: number,
  plannedAmounts: readonly number[],
) {
  const categoryTotal = plannedAmounts.reduce(
    (sum, amount) => sum + roundBudgetAmount(amount),
    0,
  )
  return Math.max(roundBudgetAmount(spendingLimit), categoryTotal)
}

export function isBudgetExpense(transaction: BudgetExpense) {
  return transaction.type === 'expense' && !transaction.excludeFromBudget
}

export function totalBudgetSpending(transactions: readonly BudgetExpense[]) {
  return transactions
    .filter(isBudgetExpense)
    .reduce((sum, transaction) => sum + transaction.amount, 0)
}

export function spentByCategory(transactions: readonly BudgetExpense[]) {
  const actualByCategory = new Map<string, number>()
  for (const transaction of transactions) {
    if (!isBudgetExpense(transaction) || !transaction.categoryId) {
      continue
    }
    actualByCategory.set(
      transaction.categoryId,
      (actualByCategory.get(transaction.categoryId) ?? 0) + transaction.amount,
    )
  }
  return actualByCategory
}

export function collectBudgetableSeeds(input: {
  categories: readonly BudgetableCategory[]
  previousBudgets: readonly { categoryId: string; plannedAmount: number }[]
  spentByCategory: ReadonlyMap<string, number>
}): {
  categories: PreviousCategoryBudget[]
  previousActualSpending: number
} {
  const budgetableKeys = new Set(
    input.categories
      .filter((category) => !category.isSystem && !category.archived)
      .map((category) => category.key),
  )
  const plannedByCategory = new Map(
    input.previousBudgets
      .filter((budget) => budgetableKeys.has(budget.categoryId))
      .map((budget) => [budget.categoryId, budget.plannedAmount]),
  )
  const spentOnBudgetable = new Map(
    [...input.spentByCategory.entries()].filter(([categoryId]) =>
      budgetableKeys.has(categoryId),
    ),
  )
  const categoryIds = new Set([
    ...plannedByCategory.keys(),
    ...spentOnBudgetable.keys(),
  ])

  return {
    categories: [...categoryIds].map((categoryId) => ({
      categoryId,
      spent: spentOnBudgetable.get(categoryId) ?? 0,
      planned: plannedByCategory.get(categoryId) ?? 0,
    })),
    previousActualSpending: [...spentOnBudgetable.values()].reduce(
      (sum, amount) => sum + amount,
      0,
    ),
  }
}

export function plansFitSpendingLimit(
  categoryPlans: readonly { plannedAmount: number }[],
  spendingLimit: number,
) {
  const total = categoryPlans.reduce((sum, plan) => sum + plan.plannedAmount, 0)
  return total <= spendingLimit
}
