import assert from 'node:assert/strict'
import { test } from 'node:test'

import { accountBalanceImpacts, currencyToMwk, mwkToCurrency } from './fx.ts'

const currencies = new Map([
  ['usd', 'USD' as const],
  ['usd-2', 'USD' as const],
  ['natbank', 'MWK' as const],
  ['cash', 'MWK' as const],
])

test('converts MWK into USD at the captured rate', () => {
  assert.equal(mwkToCurrency(780_000, 'USD', 3900), 200)
  assert.equal(mwkToCurrency(780_000, 'MWK', 3900), 780_000)
  assert.equal(currencyToMwk(200, 'USD', 3900), 780_000)
})

test('USD conversion requires a positive rate', () => {
  assert.throws(() => mwkToCurrency(780_000, 'USD'), /USD rate is required/)
  assert.throws(() => mwkToCurrency(780_000, 'USD', 0), /positive number/)
  assert.throws(() => mwkToCurrency(1, 'USD', 3900), /too small/)
})

test('USD to MWK transfer debits dollars and credits kwacha', () => {
  const impacts = accountBalanceImpacts({
    type: 'transfer',
    amount: 780_000,
    accountId: 'usd',
    toAccountId: 'natbank',
    currencyByAccountId: currencies,
    usdRate: 3900,
  })

  assert.equal(impacts.get('usd'), -200)
  assert.equal(impacts.get('natbank'), 780_000)
})

test('MWK to USD transfer credits dollars at the captured rate', () => {
  const impacts = accountBalanceImpacts({
    type: 'transfer',
    amount: 780_000,
    accountId: 'natbank',
    toAccountId: 'usd',
    currencyByAccountId: currencies,
    usdRate: 3900,
  })

  assert.equal(impacts.get('natbank'), -780_000)
  assert.equal(impacts.get('usd'), 200)
})

test('same-currency MWK transfers stay 1:1', () => {
  const impacts = accountBalanceImpacts({
    type: 'transfer',
    amount: 50_000,
    accountId: 'natbank',
    toAccountId: 'cash',
    currencyByAccountId: currencies,
    usdRate: 3900,
  })

  assert.equal(impacts.get('natbank'), -50_000)
  assert.equal(impacts.get('cash'), 50_000)
})

test('USD to USD transfer converts both legs', () => {
  const impacts = accountBalanceImpacts({
    type: 'transfer',
    amount: 780_000,
    accountId: 'usd',
    toAccountId: 'usd-2',
    currencyByAccountId: currencies,
    usdRate: 3900,
  })

  assert.equal(impacts.get('usd'), -200)
  assert.equal(impacts.get('usd-2'), 200)
})

test('refuses to book a USD transfer without a rate', () => {
  assert.throws(
    () =>
      accountBalanceImpacts({
        type: 'transfer',
        amount: 780_000,
        accountId: 'usd',
        toAccountId: 'natbank',
        currencyByAccountId: currencies,
      }),
    /USD rate is required/,
  )
})

test('income and expense on a USD account convert from MWK', () => {
  const expense = accountBalanceImpacts({
    type: 'expense',
    amount: 780_000,
    accountId: 'usd',
    currencyByAccountId: currencies,
    usdRate: 3900,
  })
  const income = accountBalanceImpacts({
    type: 'income',
    amount: 780_000,
    accountId: 'usd',
    currencyByAccountId: currencies,
    usdRate: 3900,
  })

  assert.equal(expense.get('usd'), -200)
  assert.equal(income.get('usd'), 200)
})

test('entered USD converts to MWK at the captured rate, not a later setting', () => {
  const capturedRate = 3900
  const storedMwk = currencyToMwk(200, 'USD', capturedRate)
  assert.equal(storedMwk, 780_000)
  assert.equal(mwkToCurrency(storedMwk, 'USD', capturedRate), 200)
  assert.notEqual(currencyToMwk(200, 'USD', 4000), storedMwk)
})

test('allocations do not move account balances', () => {
  const impacts = accountBalanceImpacts({
    type: 'allocation',
    amount: 780_000,
    currencyByAccountId: currencies,
    usdRate: 3900,
  })

  assert.equal(impacts.size, 0)
})

test('claim repay and lend debit the account', () => {
  const repay = accountBalanceImpacts({
    type: 'claim',
    amount: 20_000,
    accountId: 'cash',
    claimAction: 'repay',
    currencyByAccountId: currencies,
  })
  assert.equal(repay.get('cash'), -20_000)
})

test('claim borrow and collect credit the account', () => {
  const borrow = accountBalanceImpacts({
    type: 'claim',
    amount: 20_000,
    accountId: 'cash',
    claimAction: 'borrow',
    currencyByAccountId: currencies,
  })
  assert.equal(borrow.get('cash'), 20_000)
})

test('claim adjust and claim-only tabs do not move accounts', () => {
  const adjust = accountBalanceImpacts({
    type: 'claim',
    amount: 20_000,
    claimAction: 'adjust',
    currencyByAccountId: currencies,
  })
  const tab = accountBalanceImpacts({
    type: 'claim',
    amount: 20_000,
    claimAction: 'borrow',
    currencyByAccountId: currencies,
  })
  assert.equal(adjust.size, 0)
  assert.equal(tab.size, 0)
})
