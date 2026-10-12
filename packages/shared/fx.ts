import { claimCashKind } from './claim.ts'

import type { ClaimAction } from './claim.ts'

export type MoneyCurrency = 'MWK' | 'USD'
export type BalanceTxnType =
  'expense' | 'income' | 'transfer' | 'allocation' | 'claim'

export function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100
}

export function assertUsdRate(usdRate: number) {
  if (!Number.isFinite(usdRate) || usdRate <= 0) {
    throw new Error('USD rate must be a positive number')
  }
}

export function mwkToCurrency(
  mwkAmount: number,
  currency: MoneyCurrency,
  usdRate?: number,
) {
  if (currency !== 'USD') return roundMoney(mwkAmount)
  if (usdRate === undefined) {
    throw new Error('A USD rate is required to update a USD account')
  }
  assertUsdRate(usdRate)
  const usdAmount = roundMoney(mwkAmount / usdRate)
  if (usdAmount === 0 && mwkAmount !== 0) {
    throw new Error('Amount is too small to record in USD at this rate')
  }
  return usdAmount
}

export function currencyToMwk(
  amount: number,
  currency: MoneyCurrency,
  usdRate: number,
) {
  if (currency !== 'USD') return roundMoney(amount)
  assertUsdRate(usdRate)
  const mwkAmount = roundMoney(amount * usdRate)
  if (mwkAmount === 0 && amount !== 0) {
    throw new Error('Amount is too small to record in MWK at this rate')
  }
  return mwkAmount
}

export function accountBalanceImpacts({
  type,
  amount,
  accountId,
  toAccountId,
  claimAction,
  currencyByAccountId,
  usdRate,
}: {
  type: BalanceTxnType
  amount: number
  accountId?: string
  toAccountId?: string
  claimAction?: ClaimAction
  currencyByAccountId: ReadonlyMap<string, MoneyCurrency>
  usdRate?: number
}) {
  const impacts = new Map<string, number>()
  const addImpact = (id: string, delta: number) => {
    impacts.set(id, roundMoney((impacts.get(id) ?? 0) + delta))
  }
  const nativeDelta = (id: string, mwkDelta: number) => {
    const currency = currencyByAccountId.get(id)
    if (!currency) {
      throw new Error('Account not found')
    }
    const sign = mwkDelta < 0 ? -1 : 1
    return sign * mwkToCurrency(Math.abs(mwkDelta), currency, usdRate)
  }

  if (type === 'allocation') {
    return impacts
  }

  if (type === 'claim') {
    if (!accountId || !claimAction) return impacts
    const cash = claimCashKind(claimAction)
    if (cash === 'in') {
      addImpact(accountId, nativeDelta(accountId, amount))
    } else if (cash === 'out') {
      addImpact(accountId, nativeDelta(accountId, -amount))
    }
    return impacts
  }

  if (!accountId) {
    throw new Error('An account is required')
  }

  if (type === 'expense') {
    addImpact(accountId, nativeDelta(accountId, -amount))
    return impacts
  }
  if (type === 'income') {
    addImpact(accountId, nativeDelta(accountId, amount))
    return impacts
  }
  if (!toAccountId) {
    throw new Error('A destination account is required for transfers')
  }
  addImpact(accountId, nativeDelta(accountId, -amount))
  addImpact(toAccountId, nativeDelta(toAccountId, amount))
  return impacts
}
