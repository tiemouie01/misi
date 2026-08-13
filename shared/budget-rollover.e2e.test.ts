import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  collectBudgetableSeeds,
  hasPreviousSpend,
  plansFitSpendingLimit,
  seedCycleBudgetsFromPrevious,
  spentByCategory,
  spendingLimitForPlans,
} from './budget-rollover.ts'

const categories = [
  { key: 'groceries', isSystem: false },
  { key: 'transport', isSystem: false },
  { key: 'airtime', isSystem: false },
  { key: 'health', isSystem: false, archived: true },
  { key: 'adjustment', isSystem: true },
] as const

function rolloverFromLastCycle(input: {
  transactions: Parameters<typeof spentByCategory>[0]
  previousBudgets: Array<{ categoryId: string; plannedAmount: number }>
  previousSpendingLimit: number
}) {
  const seeds = collectBudgetableSeeds({
    categories,
    previousBudgets: input.previousBudgets,
    spentByCategory: spentByCategory(input.transactions),
  })
  const seeded = seedCycleBudgetsFromPrevious({
    ...seeds,
    previousSpendingLimit: input.previousSpendingLimit,
  })
  const draftLimit = spendingLimitForPlans(
    seeded.spendingLimit,
    seeded.categoryPlans.map((plan) => plan.plannedAmount),
  )
  return { seeds, seeded, draftLimit }
}

test('e2e: payday rollover seeds the next plan from last cycle spend', () => {
  const { seeded, draftLimit } = rolloverFromLastCycle({
    previousSpendingLimit: 650_000,
    previousBudgets: [
      { categoryId: 'groceries', plannedAmount: 220_000 },
      { categoryId: 'transport', plannedAmount: 90_000 },
    ],
    transactions: [
      { type: 'expense', categoryId: 'groceries', amount: 180_400 },
      { type: 'expense', categoryId: 'groceries', amount: 12_250.4 },
      { type: 'expense', categoryId: 'transport', amount: 40_000 },
      { type: 'expense', categoryId: 'airtime', amount: 8_000 },
      {
        type: 'expense',
        categoryId: 'health',
        amount: 25_000,
      },
      {
        type: 'expense',
        categoryId: 'adjustment',
        amount: 5_000,
        excludeFromBudget: true,
      },
      { type: 'income', amount: 1_850_000 },
    ],
  })

  assert.equal(seeded.usedActuals, true)
  assert.deepEqual(
    Object.fromEntries(
      seeded.categoryPlans.map((plan) => [plan.categoryId, plan.plannedAmount]),
    ),
    {
      groceries: 192_650,
      transport: 40_000,
      airtime: 8_000,
    },
  )
  assert.equal(seeded.spendingLimit, 240_650)
  assert.equal(draftLimit, seeded.spendingLimit)
  assert.equal(plansFitSpendingLimit(seeded.categoryPlans, draftLimit), true)
})

test('e2e: empty last cycle keeps the previous plan instead of zeroing it', () => {
  const { seeded } = rolloverFromLastCycle({
    previousSpendingLimit: 650_000,
    previousBudgets: [
      { categoryId: 'groceries', plannedAmount: 220_000 },
      { categoryId: 'transport', plannedAmount: 90_000 },
    ],
    transactions: [{ type: 'income', amount: 1_850_000 }],
  })

  assert.equal(seeded.usedActuals, false)
  assert.deepEqual(
    Object.fromEntries(
      seeded.categoryPlans.map((plan) => [plan.categoryId, plan.plannedAmount]),
    ),
    {
      groceries: 220_000,
      transport: 90_000,
    },
  )
  assert.equal(seeded.spendingLimit, 650_000)
  assert.equal(
    hasPreviousSpend({
      previousActualSpending: 0,
      categorySpent: seeded.categoryPlans.map(() => 0),
    }),
    false,
  )
})

test('e2e: editor apply uses last cycle spend and stays saveable', () => {
  const previousRows = [
    { categoryId: 'groceries', actualAmount: 10.6, archived: false },
    { categoryId: 'transport', actualAmount: 10.6, archived: false },
    { categoryId: 'health', actualAmount: 80_000, archived: true },
  ]
  const previousActualSpending = previousRows
    .filter((row) => !row.archived)
    .reduce((sum, row) => sum + row.actualAmount, 0)
  const editorCategories = previousRows
    .filter((row) => !row.archived)
    .map((row) => ({
      categoryId: row.categoryId,
      spent: row.actualAmount,
      planned: 20,
    }))

  assert.equal(hasPreviousSpend({ previousActualSpending }), true)

  const applied = seedCycleBudgetsFromPrevious({
    categories: editorCategories,
    previousActualSpending,
    previousSpendingLimit: 21.2,
  })
  const draftLimit = spendingLimitForPlans(
    applied.spendingLimit,
    applied.categoryPlans.map((plan) => plan.plannedAmount),
  )

  assert.deepEqual(applied.categoryPlans, [
    { categoryId: 'groceries', plannedAmount: 11 },
    { categoryId: 'transport', plannedAmount: 11 },
  ])
  assert.equal(applied.spendingLimit, 22)
  assert.equal(draftLimit, 22)
  assert.equal(plansFitSpendingLimit(applied.categoryPlans, draftLimit), true)
})
