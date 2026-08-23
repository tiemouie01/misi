import assert from 'node:assert/strict'
import { test } from 'node:test'

import { foldSavingsBalance, savingsEnvelopeContribution } from './savings.ts'

test('folds savings allocations and spending from the opening balance', () => {
  assert.equal(
    foldSavingsBalance(100, [
      { type: 'allocation', direction: 'toSavings', amount: 50 },
      { type: 'expense', amount: 20 },
      { type: 'transfer', amount: 10 },
      { type: 'claim', amount: 5 },
      { type: 'allocation', direction: 'toSpending', amount: 15 },
      { type: 'income', amount: 999 },
    ]),
    100,
  )
})

test('can resume a fold at a checkpoint and exclude a transaction', () => {
  const beforeCheckpoint = [
    {
      id: 'old-allocation',
      type: 'allocation' as const,
      direction: 'toSavings' as const,
      amount: 100,
    },
  ]
  const afterCheckpoint = [
    { id: 'spend', type: 'expense' as const, amount: 25 },
    {
      id: 'new-allocation',
      type: 'allocation' as const,
      direction: 'toSavings' as const,
      amount: 40,
    },
  ]

  const checkpoint = foldSavingsBalance(0, beforeCheckpoint)
  assert.equal(foldSavingsBalance(checkpoint, afterCheckpoint), 115)
  assert.equal(foldSavingsBalance(checkpoint, afterCheckpoint, 'spend'), 140)
})

test('does not treat income as a savings-envelope movement', () => {
  assert.equal(savingsEnvelopeContribution({ type: 'income', amount: 100 }), 0)
})
