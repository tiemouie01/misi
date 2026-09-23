import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  checkpointDebtOpeningBalance,
  isBeforeCheckpoint,
  mergeCheckpointDebtEntries,
} from './checkpoints.ts'

test('uses an exact asOf boundary: boundary movements are not summarized', () => {
  assert.equal(isBeforeCheckpoint(1_000, 999), true)
  assert.equal(isBeforeCheckpoint(1_000, 1_000), false)
  assert.equal(isBeforeCheckpoint(1_000, 1_001), false)
})

test('new debts use their opening balance when absent from a checkpoint', () => {
  const entries = [{ debtId: 'existing', remaining: 80 }]
  assert.equal(checkpointDebtOpeningBalance(entries, 'existing', 500), 80)
  assert.equal(checkpointDebtOpeningBalance(entries, 'new', 500), 500)
})

test('merging folds the source remaining into the target entry', () => {
  const source = { debtId: 'source', openingBalance: 300 }
  const target = { debtId: 'target', openingBalance: 500 }
  const cases = [
    [
      { debtId: 'source', remaining: 120.1 },
      { debtId: 'target', remaining: 80.2 },
    ],
    [{ debtId: 'target', remaining: 80 }],
    [{ debtId: 'source', remaining: 120 }],
    [],
  ]
  for (const debts of cases) {
    const entries = [{ debtId: 'other', remaining: 7 }, ...debts]
    const before =
      checkpointDebtOpeningBalance(entries, 'source', source.openingBalance) +
      checkpointDebtOpeningBalance(entries, 'target', target.openingBalance)
    const merged = mergeCheckpointDebtEntries(entries, source, target)
    // The target's opening becomes the sum, so read it back with that base.
    assert.equal(
      checkpointDebtOpeningBalance(merged, 'target', 800),
      Math.round(before * 100) / 100,
    )
    assert.equal(
      merged.some((entry) => entry.debtId === 'source'),
      false,
    )
    assert.equal(checkpointDebtOpeningBalance(merged, 'other', 0), 7)
  }
})
