import assert from 'node:assert/strict'
import { test } from 'node:test'

import { actualSplit, splitOf } from './spending-split.ts'

test('splits amounts into whole percents that total 100', () => {
  const split = splitOf({ needs: 1, wants: 1, savings: 1 })
  assert.equal(split.total, 3)
  assert.deepEqual(
    split.parts.map((part) => part.percent),
    [34, 33, 33],
  )
})

test('treats negative amounts as nothing and handles an empty split', () => {
  const split = splitOf({ needs: 300, wants: 100, savings: -50 })
  assert.equal(split.total, 400)
  assert.deepEqual(
    split.parts.map((part) => [part.key, part.amount, part.percent]),
    [
      ['needs', 300, 75],
      ['wants', 100, 25],
      ['savings', 0, 0],
    ],
  )

  assert.deepEqual(
    splitOf({ needs: 0, wants: 0 }).parts.map((part) => part.percent),
    [0, 0],
  )
})

test('groups actual spending and adds the net saved', () => {
  const split = actualSplit({
    categories: [
      { group: 'needs', spent: 500 },
      { group: 'needs', spent: 100 },
      { group: 'wants', spent: 200 },
    ],
    actualSpending: 800,
    actualSavings: 200,
  })
  assert.equal(split.total, 1000)
  assert.deepEqual(
    split.parts.map((part) => [part.key, part.percent]),
    [
      ['needs', 60],
      ['wants', 20],
      ['savings', 20],
    ],
  )
})

test('shows spending outside the listed categories as other', () => {
  const split = actualSplit({
    categories: [{ group: 'wants', spent: 300 }],
    actualSpending: 400.4,
    actualSavings: 0,
  })
  const other = split.parts.find((part) => part.key === 'other')
  assert.ok(other)
  assert.ok(Math.abs(other.amount - 100.4) < 1e-9)

  const dust = actualSplit({
    categories: [{ group: 'needs', spent: 300 }],
    actualSpending: 300.5,
    actualSavings: 0,
  })
  assert.equal(
    dust.parts.some((part) => part.key === 'other'),
    false,
  )
})
