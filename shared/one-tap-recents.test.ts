import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ONE_TAP_RECENTS_LIMIT,
  categoryUsageFromLogs,
  oneTapRecentKey,
  oneTapRecentsFromLogs,
} from './one-tap-recents.ts'

import type { OneTapRecentLog } from './one-tap-recents.ts'

function expense(
  overrides: Partial<OneTapRecentLog> &
    Pick<OneTapRecentLog, 'payee' | 'amount' | 'occurredAt'>,
): OneTapRecentLog {
  return {
    type: 'expense',
    categoryId: 'transport',
    accountId: 'airtel',
    ...overrides,
  }
}

test('ranks payee and category pairs by how often they were logged', () => {
  const recents = oneTapRecentsFromLogs([
    expense({ payee: 'Chipiku', amount: 42_000, occurredAt: 1 }),
    expense({
      payee: 'Airtime',
      amount: 5_000,
      categoryId: 'airtime',
      occurredAt: 2,
    }),
    expense({
      payee: 'Airtime',
      amount: 5_000,
      categoryId: 'airtime',
      occurredAt: 3,
    }),
    expense({ payee: 'Minibus', amount: 3_500, occurredAt: 4 }),
    expense({ payee: 'Minibus', amount: 3_500, occurredAt: 5 }),
    expense({ payee: 'Minibus', amount: 3_500, occurredAt: 6 }),
  ])

  assert.deepEqual(
    recents.map((recent) => recent.payee),
    ['Minibus', 'Airtime', 'Chipiku'],
  )
  assert.equal(recents[0]?.amount, 3_500)
})

test('uses the most common amount for a frequent payee', () => {
  const recents = oneTapRecentsFromLogs([
    expense({ payee: 'Minibus', amount: 4_000, occurredAt: 1 }),
    expense({ payee: 'Minibus', amount: 3_500, occurredAt: 2 }),
    expense({ payee: 'Minibus', amount: 3_500, occurredAt: 3 }),
    expense({ payee: 'Minibus', amount: 4_000, occurredAt: 4 }),
    expense({ payee: 'Minibus', amount: 3_500, occurredAt: 5 }),
  ])

  assert.equal(recents[0]?.payee, 'Minibus')
  assert.equal(recents[0]?.amount, 3_500)
})

test('breaks amount ties with the more recent amount', () => {
  const recents = oneTapRecentsFromLogs([
    expense({ payee: 'Minibus', amount: 3_500, occurredAt: 1 }),
    expense({ payee: 'Minibus', amount: 4_000, occurredAt: 2 }),
  ])

  assert.equal(recents[0]?.amount, 4_000)
})

test('breaks frequency ties with the more recently used payee', () => {
  const recents = oneTapRecentsFromLogs([
    expense({ payee: 'Minibus', amount: 3_500, occurredAt: 1 }),
    expense({
      payee: 'Airtime',
      amount: 5_000,
      categoryId: 'airtime',
      occurredAt: 2,
    }),
  ])

  assert.equal(recents[0]?.payee, 'Airtime')
  assert.equal(recents[1]?.payee, 'Minibus')
})

test('treats the same payee with different spelling as one habit', () => {
  const recents = oneTapRecentsFromLogs([
    expense({ payee: 'minibus', amount: 3_500, occurredAt: 1 }),
    expense({ payee: '  MiniBus  ', amount: 3_500, occurredAt: 2 }),
  ])

  assert.equal(recents.length, 1)
  assert.equal(recents[0]?.payee, 'MiniBus')
})

test('uses the latest account for the usual amount', () => {
  const recents = oneTapRecentsFromLogs([
    expense({
      payee: 'Minibus',
      amount: 3_500,
      accountId: 'airtel',
      occurredAt: 1,
    }),
    expense({
      payee: 'Minibus',
      amount: 3_500,
      accountId: 'cash',
      occurredAt: 2,
    }),
  ])

  assert.equal(recents[0]?.accountId, 'cash')
})

test('skips logs that cannot become a one-tap expense', () => {
  const recents = oneTapRecentsFromLogs([
    expense({ payee: 'Salary', amount: 10_000, type: 'income', occurredAt: 8 }),
    expense({
      payee: 'Transfer',
      amount: 10_000,
      type: 'transfer',
      occurredAt: 7,
    }),
    expense({
      payee: 'Adjustment',
      amount: 10_000,
      adjustment: true,
      occurredAt: 6,
    }),
    expense({
      payee: 'Auto-save',
      amount: 10_000,
      autoSave: true,
      occurredAt: 5,
    }),
    expense({ payee: '   ', amount: 10_000, occurredAt: 4 }),
    expense({
      payee: 'No category',
      amount: 10_000,
      categoryId: undefined,
      occurredAt: 3,
    }),
    expense({
      payee: 'No account',
      amount: 10_000,
      accountId: undefined,
      occurredAt: 2,
    }),
    expense({ payee: 'Zero', amount: 0, occurredAt: 1 }),
  ])

  assert.deepEqual(recents, [])
})

test('ignores logs older than the recency window', () => {
  const recents = oneTapRecentsFromLogs(
    [
      expense({ payee: 'Old minibus', amount: 3_500, occurredAt: 1 }),
      expense({ payee: 'Recent airtime', amount: 5_000, occurredAt: 20 }),
    ],
    { sinceOccurredAt: 10 },
  )

  assert.deepEqual(
    recents.map((recent) => recent.payee),
    ['Recent airtime'],
  )
})

test('caps the list at the default one-tap limit', () => {
  const recents = oneTapRecentsFromLogs([
    expense({ payee: 'One', amount: 1, occurredAt: 1 }),
    expense({ payee: 'Two', amount: 2, occurredAt: 2 }),
    expense({ payee: 'Three', amount: 3, occurredAt: 3 }),
    expense({ payee: 'Four', amount: 4, occurredAt: 4 }),
  ])

  assert.equal(recents.length, ONE_TAP_RECENTS_LIMIT)
  assert.deepEqual(
    recents.map((recent) => recent.payee),
    ['Four', 'Three', 'Two'],
  )
})

test('builds a stable key for chips with the same payee', () => {
  assert.equal(
    oneTapRecentKey({
      payee: 'Minibus',
      amount: 3_500,
      categoryId: 'transport',
    }),
    oneTapRecentKey({
      payee: 'minibus',
      amount: 3_500,
      categoryId: 'transport',
    }),
  )
})

test('ranks categories by expense count, then recency, skipping adjustments', () => {
  assert.deepEqual(
    categoryUsageFromLogs([
      expense({
        payee: 'Chipiku',
        amount: 1,
        categoryId: 'groceries',
        occurredAt: 1,
      }),
      expense({ payee: 'Minibus', amount: 1, occurredAt: 2 }),
      expense({ payee: 'Minibus', amount: 1, occurredAt: 3 }),
      expense({
        payee: 'Airtime',
        amount: 1,
        categoryId: 'airtime',
        occurredAt: 4,
      }),
      expense({
        payee: 'Fix',
        amount: 1,
        categoryId: 'adjustment',
        occurredAt: 5,
        adjustment: true,
      }),
      {
        type: 'income',
        payee: 'Salary',
        amount: 1,
        categoryId: 'salary',
        occurredAt: 6,
      },
    ]),
    ['transport', 'airtime', 'groceries'],
  )
})
