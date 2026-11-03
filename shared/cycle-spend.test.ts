import assert from 'node:assert/strict'
import { test } from 'node:test'

import { cycleSpend, recentDays } from './cycle-spend.ts'

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

test('projects the average so far to payday only once there is enough history', () => {
  const early = cycleSpend({
    startsAt: start,
    endsAt: end,
    now: start + DAY,
    expenses: [{ amount: 100, occurredAt: start }],
  })
  assert.equal(early.projected, null)

  const later = cycleSpend({
    startsAt: start,
    endsAt: end,
    now: start + 9 * DAY,
    expenses: [{ amount: 1000, occurredAt: start }],
  })
  assert.equal(later.projected, (1000 / 10) * 31)
})

test('stops projecting on the last day and clamps today to the cycle', () => {
  const result = cycleSpend({
    startsAt: start,
    endsAt: end,
    now: end + 5 * DAY,
    expenses: [],
  })
  assert.equal(result.today, 30)
  assert.equal(result.projected, null)
  assert.equal(result.daily.length, 31)
})

test('pads the recent strip with nulls before the cycle began', () => {
  assert.deepEqual(recentDays([1, 2], 4), [null, null, 1, 2])
  assert.deepEqual(recentDays([1, 2, 3, 4, 5], 3), [3, 4, 5])
})
