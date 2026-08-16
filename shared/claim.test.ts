import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  claimActionLabel,
  claimActionMatchesDirection,
  claimCashKind,
  claimFeedTitle,
  claimRemainingDelta,
  computeClaimRemaining,
  defaultClaimAction,
  remainingAfterReplacement,
  sortDebtsByRemaining,
} from './claim.ts'

test('remaining is opening plus signed movements', () => {
  assert.equal(
    computeClaimRemaining(50_000, [
      { id: 'b1', action: 'borrow', amount: 20_000 },
      { id: 'r1', action: 'repay', amount: 15_000 },
      { id: 'a1', action: 'adjust', amount: 5_000, adjustPolarity: 'decrease' },
    ]),
    50_000,
  )
})

test('excludeId ignores a movement when recomputing', () => {
  assert.equal(
    computeClaimRemaining(
      0,
      [
        { id: 'b1', action: 'borrow', amount: 50_000 },
        { id: 'r1', action: 'repay', amount: 20_000 },
      ],
      'b1',
    ),
    -20_000,
  )
})

test('adjust polarity changes remaining in both directions', () => {
  assert.equal(
    claimRemainingDelta({
      action: 'adjust',
      amount: 2_000,
      adjustPolarity: 'increase',
    }),
    2_000,
  )
  assert.equal(
    claimRemainingDelta({
      action: 'adjust',
      amount: 2_000,
      adjustPolarity: 'decrease',
    }),
    -2_000,
  )
})

test('actions match the claim direction', () => {
  assert.equal(claimActionMatchesDirection('repay', 'you_owe'), true)
  assert.equal(claimActionMatchesDirection('borrow', 'you_owe'), true)
  assert.equal(claimActionMatchesDirection('collect', 'you_owe'), false)
  assert.equal(claimActionMatchesDirection('lend', 'owed_to_you'), true)
  assert.equal(claimActionMatchesDirection('adjust', 'owed_to_you'), true)
  assert.equal(defaultClaimAction('you_owe'), 'repay')
  assert.equal(defaultClaimAction('owed_to_you'), 'collect')
})

test('cash kind is in, out, or none', () => {
  assert.equal(claimCashKind('borrow'), 'in')
  assert.equal(claimCashKind('collect'), 'in')
  assert.equal(claimCashKind('repay'), 'out')
  assert.equal(claimCashKind('lend'), 'out')
  assert.equal(claimCashKind('adjust'), null)
})

test('feed titles name the action and the obligation', () => {
  assert.equal(claimFeedTitle('repay', 'Chisomo'), 'Repay · Chisomo')
  assert.equal(
    claimFeedTitle('adjust', 'NBS car', 'decrease'),
    'Adjust down · NBS car',
  )
})

test('adjust label stays generic until polarity is chosen', () => {
  assert.equal(claimActionLabel('adjust'), 'Adjust')
  assert.equal(claimActionLabel('adjust', 'increase'), 'Adjust up')
  assert.equal(claimActionLabel('adjust', 'decrease'), 'Adjust down')
  assert.equal(claimActionLabel('repay'), 'Repay')
})

test('remaining after replacement accounts for the edited movement', () => {
  assert.equal(
    remainingAfterReplacement(30_000, {
      action: 'repay',
      amount: 40_000,
    }),
    -10_000,
  )
  assert.equal(
    remainingAfterReplacement(
      30_000,
      { action: 'repay', amount: 20_000 },
      { action: 'repay', amount: 20_000 },
    ),
    30_000,
  )
  assert.equal(
    remainingAfterReplacement(
      30_000,
      { action: 'repay', amount: 40_000 },
      { action: 'repay', amount: 20_000 },
    ),
    10_000,
  )
})

test('lists sort by remaining then name', () => {
  const sorted = sortDebtsByRemaining([
    { name: 'Zola', remaining: 10_000 },
    { name: 'Chisomo', remaining: 50_000 },
    { name: 'Abel', remaining: 50_000 },
  ])
  assert.deepEqual(
    sorted.map((debt) => debt.name),
    ['Abel', 'Chisomo', 'Zola'],
  )
})
