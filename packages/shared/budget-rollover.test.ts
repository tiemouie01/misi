import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  hasPreviousSpend,
  seedCycleBudgetsFromPrevious,
  spendingLimitForPlans,
} from './budget-rollover.ts'

test('seeds category plans from last cycle spend', () => {
  const seeded = seedCycleBudgetsFromPrevious({
    categories: [
      { categoryId: 'groceries', spent: 180_400, planned: 220_000 },
      { categoryId: 'transport', spent: 0, planned: 90_000 },
      { categoryId: 'airtime', spent: 12_250.4, planned: 0 },
    ],
    previousActualSpending: 192_650.4,
    previousSpendingLimit: 650_000,
  })

  assert.equal(seeded.usedActuals, true)
  assert.deepEqual(seeded.categoryPlans, [
    { categoryId: 'groceries', plannedAmount: 180_400 },
    { categoryId: 'transport', plannedAmount: 0 },
    { categoryId: 'airtime', plannedAmount: 12_250 },
  ])
  assert.equal(seeded.spendingLimit, 192_650)
})

test('keeps previous plans when last cycle had no spend', () => {
  const seeded = seedCycleBudgetsFromPrevious({
    categories: [
      { categoryId: 'groceries', spent: 0, planned: 220_000 },
      { categoryId: 'transport', spent: 0, planned: 90_000 },
    ],
    previousActualSpending: 0,
    previousSpendingLimit: 650_000,
  })

  assert.equal(seeded.usedActuals, false)
  assert.deepEqual(seeded.categoryPlans, [
    { categoryId: 'groceries', plannedAmount: 220_000 },
    { categoryId: 'transport', plannedAmount: 90_000 },
  ])
  assert.equal(seeded.spendingLimit, 650_000)
})

test('rounded category plans never exceed the seeded spending limit', () => {
  const seeded = seedCycleBudgetsFromPrevious({
    categories: [
      { categoryId: 'a', spent: 10.6, planned: 20 },
      { categoryId: 'b', spent: 10.6, planned: 20 },
    ],
    previousActualSpending: 21.2,
    previousSpendingLimit: 21.2,
  })

  const categoryTotal = seeded.categoryPlans.reduce(
    (sum, plan) => sum + plan.plannedAmount,
    0,
  )
  assert.equal(categoryTotal, 22)
  assert.equal(seeded.spendingLimit, categoryTotal)
})

test('create-draft limit lift keeps rounded plans saveable', () => {
  assert.equal(spendingLimitForPlans(21.2, [10.6, 10.6]), 22)
  assert.equal(spendingLimitForPlans(650_000, [220_000, 90_000]), 650_000)
})

test('only seeds the categories the caller considers budgetable', () => {
  const seeded = seedCycleBudgetsFromPrevious({
    categories: [{ categoryId: 'groceries', spent: 80_000, planned: 100_000 }],
    previousActualSpending: 80_000,
    previousSpendingLimit: 100_000,
  })

  assert.deepEqual(
    seeded.categoryPlans.map((plan) => plan.categoryId),
    ['groceries'],
  )
  assert.equal(seeded.spendingLimit, 80_000)
})

test('hasPreviousSpend ignores empty history', () => {
  assert.equal(
    hasPreviousSpend({ previousActualSpending: 0, categorySpent: [0] }),
    false,
  )
  assert.equal(
    hasPreviousSpend({ previousActualSpending: 0, categorySpent: [0.4] }),
    false,
  )
  assert.equal(
    hasPreviousSpend({ previousActualSpending: 12_000, categorySpent: [0] }),
    true,
  )
  assert.equal(
    hasPreviousSpend({ previousActualSpending: 0, categorySpent: [1] }),
    true,
  )
})
