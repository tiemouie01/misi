import assert from 'node:assert/strict'
import { test } from 'node:test'

import { cycleSpend } from './cycle-spend.ts'

const DAY = 86_400_000
const start = Date.UTC(2026, 9, 20) - 2 * 60 * 60 * 1000
const end = start + 31 * DAY - 1

test('buckets expenses by cycle day and keeps a running total', () => {
  const result = cycleSpend({
    startsAt: start,
    endsAt: end,
    now: start + 3 * DAY + 5,
    expenses: [
      { amount: 100, occurredAt: start },
      { amount: 50, occurredAt: start + DAY - 1 },
      { amount: 20, occurredAt: start + 2 * DAY },
      { amount: 5, occurredAt: start + 3 * DAY + 1 },
    ],
  })
  assert.equal(result.totalDays, 31)
  assert.equal(result.today, 3)
  assert.deepEqual(result.daily, [150, 0, 20, 5])
  assert.deepEqual(result.cumulative, [150, 150, 170, 175])
})

test('counts out-of-range expenses on the nearest day so totals match', () => {
  const result = cycleSpend({
    startsAt: start,
    endsAt: end,
    now: start + DAY,
    expenses: [
      { amount: 10, occurredAt: start - 5 },
      { amount: 7, occurredAt: start + 10 * DAY },
    ],
  })
  assert.deepEqual(result.daily, [10, 7])
  assert.equal(result.cumulative.at(-1), 17)
})

test('clamps today to the cycle once it has ended', () => {
  const result = cycleSpend({
    startsAt: start,
    endsAt: end,
    now: end + 5 * DAY,
    expenses: [],
  })
  assert.equal(result.today, 30)
  assert.equal(result.daily.length, 31)
})
