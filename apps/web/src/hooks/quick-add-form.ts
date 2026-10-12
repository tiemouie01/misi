import { formatK, formatUsd, mwkToCurrency } from '#/lib/app-data'

import type {
  Account,
  ClaimAction,
  Debt,
  RecentTransaction,
} from '#/lib/app-data'

/** The category fields quick add needs; `#/lib/categories` `Category` fits. */
export interface QuickAddCategory {
  key: string
  name: string
  archived: boolean
  isSystem: boolean
}

export interface QuickAddIncomeSource {
  id: string
  name: string
  savingsRate?: number
  isAnchor?: boolean
}

export function findCategory<TCategory extends QuickAddCategory>(
  categories: readonly TCategory[],
  key?: string,
) {
  return categories.find((category) => category.key === key)
}

/**
 * Mirrors `firstExpenseCategoryKey` in `#/lib/categories`, which can't be
 * imported here because that module pulls in lucide-react.
 */
export function firstExpenseCategoryKey(
  categories: readonly QuickAddCategory[],
) {
  const active = categories.find(
    (category) => !category.archived && !category.isSystem,
  )
  if (active) return active.key

  const anyExpense = categories.find((category) => !category.isSystem)
  if (anyExpense) return anyExpense.key

  if (categories.length > 0) return categories[0].key
  return 'groceries'
}

export function defaultIncomeSourceId(
  sources: readonly QuickAddIncomeSource[],
) {
  const anchor = sources.find((source) => source.isAnchor)
  if (anchor) return anchor.id
  return sources.length > 0 ? sources[0].id : ''
}

export function occurredAtFromDate(date: Date) {
  const next = new Date(date)
  next.setHours(12, 0, 0, 0)
  return next.getTime()
}

const transactionDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatTransactionDate(occurredAt: number) {
  return transactionDateFormat.format(new Date(occurredAt))
}

const MAX_AMOUNT_WHOLE_DIGITS = 9
const MAX_AMOUNT_FRACTION_DIGITS = 2

export function amountToDigits(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return ''
  return String(Math.round(amount * 100) / 100)
}

export function parseAmountDigits(digits: string) {
  if (!digits || digits === '.') return 0
  const amount = Number(digits)
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100) / 100
}

export function appendAmountInput(current: string, value: string) {
  if (value === '.' || value === ',') {
    if (current.includes('.')) return current
    return current === '' ? '0.' : `${current}.`
  }

  if (!/^\d+$/.test(value)) return current

  if (current.includes('.')) {
    const [whole, fraction = ''] = current.split('.')
    if (fraction.length >= MAX_AMOUNT_FRACTION_DIGITS) return current
    const nextFraction = `${fraction}${value}`.slice(
      0,
      MAX_AMOUNT_FRACTION_DIGITS,
    )
    return `${whole}.${nextFraction}`
  }

  if (current === '0') {
    return value.replace(/^0+/, '') || '0'
  }

  const next = `${current}${value}`.replace(/^0+(\d)/, '$1')
  return next.slice(0, MAX_AMOUNT_WHOLE_DIGITS)
}

export function formatTransferLeg(
  account: Account,
  mwkAmount: number,
  usdRate: number,
  sign: '+' | '−',
) {
  const native =
    account.currency === 'USD'
      ? formatUsd(mwkToCurrency(mwkAmount, 'USD', usdRate))
      : formatK(mwkAmount)
  return `${account.name} ${sign}${native}`
}

export function formatAmountDigitsDisplay(
  digits: string,
  currency: Account['currency'],
) {
  const prefix = currency === 'USD' ? '$ ' : 'K '
  if (!digits) return `${prefix}0`

  const hasDecimal = digits.includes('.')
  const [wholePart, fractionPart = ''] = digits.split('.')
  const whole = Number(wholePart || '0')
  const formattedWhole = Number.isFinite(whole)
    ? whole.toLocaleString('en-US')
    : '0'

  if (!hasDecimal) return `${prefix}${formattedWhole}`
  return `${prefix}${formattedWhole}.${fractionPart}`
}

export function formatEnteredAmount(
  value: number,
  currency: Account['currency'],
) {
  return currency === 'USD' ? formatUsd(value) : formatK(value)
}

export function visibleRecents(
  recents: RecentTransaction[],
  categories: readonly QuickAddCategory[],
) {
  return recents.filter((recent) => {
    const category = findCategory(categories, recent.categoryId)
    return Boolean(category && !category.archived && !category.isSystem)
  })
}

/**
 * Recents store MWK amounts; show the account's native amount when the account
 * is a USD one. Falls back to the stored MWK amount if the rate is unusable.
 */
export function recentDisplayAmount(
  recent: RecentTransaction,
  account: Account | undefined,
  usdRate: number,
): { amount: number; currency: Account['currency'] } {
  if (account?.currency === 'USD' && usdRate > 0) {
    try {
      return {
        amount: mwkToCurrency(recent.amount, 'USD', usdRate),
        currency: 'USD',
      }
    } catch {
      // Treat an unusable rate as if the account were MWK.
    }
  }
  return { amount: recent.amount, currency: 'MWK' }
}

/** Claim actions offered for the selected debt. */
export function claimActionsForDebt(debt: Debt | undefined): ClaimAction[] {
  return debt
    ? debt.direction === 'you_owe'
      ? ['repay', 'borrow', 'adjust']
      : ['collect', 'lend', 'adjust']
    : ['repay']
}

/** True when another debt shares this debt's name, so its direction is shown. */
export function debtNameIsAmbiguous(debts: readonly Debt[], debt: Debt) {
  return debts.some(
    (other) =>
      other.id !== debt.id &&
      other.name.toLowerCase() === debt.name.toLowerCase(),
  )
}
