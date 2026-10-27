import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  incomeSourceStatus,
  landedAmountForSource,
  summarizeCycleIncome,
  totalActualIncome,
} from './income.ts'

test('linked income counts toward the matching source', () => {
  const transactions = [
    { type: 'income', amount: 1_850_000, sourceId: 'salary' },
  ]

  assert.equal(landedAmountForSource(transactions, 'salary'), 1_850_000)
  assert.equal(landedAmountForSource(transactions, 'allowance'), 0)
  assert.equal(totalActualIncome(transactions), 1_850_000)
})

test('unlinked income still counts in the cycle total', () => {
  const transactions = [
    { type: 'income', amount: 200_000 },
    { type: 'expense', amount: 40_000 },
  ]

  assert.equal(totalActualIncome(transactions), 200_000)
  assert.equal(landedAmountForSource(transactions, 'salary'), 0)
})

test('balance adjustments do not count as income or source landings', () => {
  const adjustment = {
    type: 'income',
    amount: 1_735,
    sourceId: 'salary',
    adjustment: true,
  }

  assert.equal(totalActualIncome([adjustment]), 0)
  assert.equal(landedAmountForSource([adjustment], 'salary'), 0)
})

test('unlinked income does not land on a source', () => {
  const transactions = [{ type: 'income', amount: 150_000 }]

  assert.equal(landedAmountForSource(transactions, 'allowance'), 0)
  assert.equal(totalActualIncome(transactions), 150_000)
})

test('income source status uses landed amounts, not just expected totals', () => {
  assert.equal(incomeSourceStatus(0, 1_850_000), 'pending')
  assert.equal(incomeSourceStatus(200_000, 1_850_000), 'partial')
  assert.equal(incomeSourceStatus(1_850_000, 1_850_000), 'landed')
  assert.equal(incomeSourceStatus(50_000, 0), 'partial')
})

const salaryPlan = { sourceId: 'salary', expectedAmount: 1_000_000 }
const bonusPlan = { sourceId: 'one-off-bonus', expectedAmount: 200_000 }
const noInvestments = new Set<string>()

test('expected income is the plan when nothing unplanned has arrived', () => {
  const summary = summarizeCycleIncome({
    transactions: [],
    plans: [salaryPlan, bonusPlan],
    nonSpendableAccountIds: noInvestments,
  })

  assert.equal(summary.plannedIncome, 1_200_000)
  assert.equal(summary.expectedIncome, 1_200_000)
  assert.equal(summary.actualIncome, 0)
})

test('a one-off line landing is not counted twice', () => {
  const summary = summarizeCycleIncome({
    transactions: [
      { type: 'income', amount: 200_000, sourceId: 'one-off-bonus' },
      { type: 'income', amount: 1_000_000, sourceId: 'salary' },
    ],
    plans: [salaryPlan, bonusPlan],
    nonSpendableAccountIds: noInvestments,
  })

  assert.equal(summary.unassignedIncome, 0)
  assert.equal(summary.expectedIncome, 1_200_000)
  assert.equal(summary.actualIncome, 1_200_000)
})

test('unplanned arrivals raise expected income', () => {
  const summary = summarizeCycleIncome({
    transactions: [
      { type: 'income', amount: 50_000 },
      { type: 'expense', amount: 90_000 },
      { type: 'income', amount: 9_000, adjustment: true },
    ],
    plans: [salaryPlan],
    nonSpendableAccountIds: noInvestments,
  })

  assert.equal(summary.unassignedIncome, 50_000)
  assert.equal(summary.expectedIncome, 1_050_000)
  assert.equal(summary.actualIncome, 50_000)
})

test('income linked to a source with no plan this cycle counts as unplanned', () => {
  const summary = summarizeCycleIncome({
    transactions: [{ type: 'income', amount: 80_000, sourceId: 'old-bonus' }],
    plans: [salaryPlan],
    nonSpendableAccountIds: noInvestments,
  })

  assert.equal(summary.expectedIncome, 1_080_000)
})

test('investment returns count as income but are reported apart', () => {
  const summary = summarizeCycleIncome({
    transactions: [
      { type: 'income', amount: 30_000, accountId: 'unit-trust' },
      { type: 'income', amount: 20_000, accountId: 'wallet' },
    ],
    plans: [salaryPlan],
    nonSpendableAccountIds: new Set(['unit-trust']),
  })

  assert.equal(summary.actualIncome, 50_000)
  assert.equal(summary.expectedIncome, 1_050_000)
  assert.equal(summary.investmentIncome, 30_000)
})
