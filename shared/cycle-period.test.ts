import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  MIN_TRANSITION_CYCLE_DAYS,
  getCyclePeriod,
  resolveCyclePeriod,
} from './cycle-period.ts'

const OFFSET_MS = 2 * 60 * 60 * 1000

/** Midnight at the start of a Blantyre calendar day (month is 1-based). */
function dayStart(year: number, month: number, day: number) {
  return Date.UTC(year, month - 1, day) - OFFSET_MS
}

/** The last millisecond of a Blantyre calendar day. */
function dayEnd(year: number, month: number, day: number) {
  return dayStart(year, month, day + 1) - 1
}

function cycle(start: [number, number, number], end: [number, number, number]) {
  return { startsAt: dayStart(...start), endsAt: dayEnd(...end) }
}

test('payday-aligned period starts on payday and ends the day before the next', () => {
  assert.deepEqual(getCyclePeriod(dayStart(2026, 11, 3) + 1000, 20), {
    label: 'Oct cycle',
    ...cycle([2026, 10, 20], [2026, 11, 19]),
  })
  assert.deepEqual(getCyclePeriod(dayStart(2026, 11, 20), 20), {
    label: 'Nov cycle',
    ...cycle([2026, 11, 20], [2026, 12, 19]),
  })
})

test('Blantyre midnight decides the cycle, not UTC midnight', () => {
  // 23:30 UTC on Nov 19 is already Nov 20 in Blantyre.
  const lateUtc = Date.UTC(2026, 10, 19, 23, 30)
  assert.equal(getCyclePeriod(lateUtc, 20).startsAt, dayStart(2026, 11, 20))
})

test('unchanged payday rolls straight into the next month', () => {
  const previous = cycle([2026, 10, 20], [2026, 11, 19])
  assert.deepEqual(resolveCyclePeriod(previous.endsAt + 1, 20, previous), {
    label: 'Nov cycle',
    ...cycle([2026, 11, 20], [2026, 12, 19]),
  })
})

test('payday moved later extends a too-short transition to the next payday', () => {
  const previous = cycle([2026, 10, 20], [2026, 11, 19])
  const next = resolveCyclePeriod(previous.endsAt + 1, 25, previous)
  // Nov 20 – Nov 24 would be only 5 days, so it runs on to Dec 24.
  assert.deepEqual(next, {
    label: 'Nov cycle',
    ...cycle([2026, 11, 20], [2026, 12, 24]),
  })
  // The cycle after it is payday-aligned again.
  assert.deepEqual(resolveCyclePeriod(next.endsAt + 1, 25, next), {
    label: 'Dec cycle',
    ...cycle([2026, 12, 25], [2027, 1, 24]),
  })
})

test('payday moved earlier shortens the transition without overlapping', () => {
  const previous = cycle([2026, 10, 20], [2026, 11, 19])
  assert.deepEqual(resolveCyclePeriod(previous.endsAt + 1, 15, previous), {
    label: 'Nov cycle',
    ...cycle([2026, 11, 20], [2026, 12, 14]),
  })
})

test('a transition of exactly the minimum length is kept as is', () => {
  // Payday 20 -> 4: Nov 20 – Dec 3 is exactly 14 days.
  const previous = cycle([2026, 10, 20], [2026, 11, 19])
  const next = resolveCyclePeriod(previous.endsAt + 1, 4, previous)
  assert.deepEqual(next, {
    label: 'Nov cycle',
    ...cycle([2026, 11, 20], [2026, 12, 3]),
  })
  assert.equal(
    (next.endsAt + 1 - next.startsAt) / (24 * 60 * 60 * 1000),
    MIN_TRANSITION_CYCLE_DAYS,
  )
})

test('a gap after the previous cycle is left as a gap', () => {
  const previous = cycle([2026, 8, 20], [2026, 9, 19])
  assert.deepEqual(resolveCyclePeriod(dayStart(2026, 11, 3), 25, previous), {
    label: 'Oct cycle',
    ...cycle([2026, 10, 25], [2026, 11, 24]),
  })
})

test('no previous cycle gives the payday-aligned period', () => {
  assert.deepEqual(
    resolveCyclePeriod(dayStart(2026, 11, 3), 25, null),
    getCyclePeriod(dayStart(2026, 11, 3), 25),
  )
})

test('periods and transitions cross the year boundary', () => {
  assert.deepEqual(getCyclePeriod(dayStart(2027, 1, 5), 20), {
    label: 'Dec cycle',
    ...cycle([2026, 12, 20], [2027, 1, 19]),
  })
  const previous = cycle([2026, 11, 20], [2026, 12, 19])
  assert.deepEqual(resolveCyclePeriod(previous.endsAt + 1, 28, previous), {
    label: 'Dec cycle',
    ...cycle([2026, 12, 20], [2027, 1, 27]),
  })
})

test('payday 28 handles February', () => {
  assert.deepEqual(getCyclePeriod(dayStart(2027, 2, 27), 28), {
    label: 'Jan cycle',
    ...cycle([2027, 1, 28], [2027, 2, 27]),
  })
  assert.deepEqual(getCyclePeriod(dayStart(2027, 2, 28), 28), {
    label: 'Feb cycle',
    ...cycle([2027, 2, 28], [2027, 3, 27]),
  })
  // Leap year: Feb 29 still belongs to the cycle that began Feb 28.
  assert.deepEqual(getCyclePeriod(dayStart(2028, 2, 29), 28), {
    label: 'Feb cycle',
    ...cycle([2028, 2, 28], [2028, 3, 27]),
  })
  // Moving payday 20 -> 28 across February.
  const previous = cycle([2027, 1, 20], [2027, 2, 19])
  assert.deepEqual(resolveCyclePeriod(previous.endsAt + 1, 28, previous), {
    label: 'Feb cycle',
    ...cycle([2027, 2, 20], [2027, 3, 27]),
  })
})
