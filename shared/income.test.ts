import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  incomeSourceStatus,
  landedAmountForSource,
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
