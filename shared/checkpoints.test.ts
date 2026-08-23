import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  checkpointDebtOpeningBalance,
  isBeforeCheckpoint,
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
