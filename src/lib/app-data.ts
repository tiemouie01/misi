import { formatK } from '../../shared/money-format'

export interface Account {
  id: string
  name: string
  kind: 'bank' | 'mobile' | 'cash' | 'investment'
  currency: 'MWK' | 'USD'
  balance: number
  includeInSpendable?: boolean
  /** Archived accounts stay only so past transactions keep their names. */
  archived: boolean
}

/** Maps a bootstrap account document to the UI shape. */
export function mapAccount(account: {
  _id: string
  name: string
  kind: Account['kind']
  currency: Account['currency']
  balance: number
  includeInSpendable?: boolean
  archivedAt?: number
}): Account {
  return {
    id: account._id,
    name: account.name,
    kind: account.kind,
    currency: account.currency,
    balance: account.balance,
    includeInSpendable: account.includeInSpendable,
    archived: account.archivedAt !== undefined,
  }
}

/**
 * The accounts quick-add starts on. A saved default wins while its account is
 * active; otherwise expense and transfer-from fall back to the first spendable
 * account, and transfer-to to the next spendable one.
 */
export function resolveQuickAddDefaults(
  accounts: Account[],
  settings:
    | {
        defaultExpenseAccountId?: string
        defaultTransferFromAccountId?: string
        defaultTransferToAccountId?: string
      }
    | null
    | undefined,
) {
  const active = accounts.filter((account) => !account.archived)
  const saved = (id: string | undefined) =>
    id !== undefined && active.some((account) => account.id === id)
      ? id
      : undefined
  const spendableIds = active
    .filter((account) => isSpendableAccount(account))
    .map((account) => account.id)
  const expense =
    saved(settings?.defaultExpenseAccountId) ?? spendableIds.at(0) ?? ''
  const transferFrom =
    saved(settings?.defaultTransferFromAccountId) ?? spendableIds.at(0) ?? ''
  const transferTo =
    saved(settings?.defaultTransferToAccountId) ??
    spendableIds.find((id) => id !== transferFrom) ??
    transferFrom
  return { expense, transferFrom, transferTo }
}

export type TxnType = 'expense' | 'income' | 'transfer' | 'allocation' | 'claim'
export type AllocationDirection = 'toSavings' | 'toSpending'
export type DebtDirection = 'you_owe' | 'owed_to_you'
export type ClaimAction = 'borrow' | 'lend' | 'repay' | 'collect' | 'adjust'
export type AdjustPolarity = 'increase' | 'decrease'

export interface Txn {
  id: string
  type: TxnType
  amount: number
  fxRate?: number
  payee: string
  categoryId?: string
  accountId?: string
  toAccountId?: string
  debtId?: string
  claimAction?: ClaimAction
  adjustPolarity?: AdjustPolarity
  direction?: AllocationDirection
  walletId: string
  sourceId?: string
  items?: string
  note?: string
  excludeFromBudget?: boolean
  occurredAt: number
  day: string
  reconcile?: true
  adjustment?: true
  autoSave?: true
}

export interface IncomeSource {
  id: string
  name: string
  expectedWindow: string
  expectedAmount: number
  expectedAmountMax?: number
  landedAmount: number
  status: 'landed' | 'partial' | 'pending'
  statusNote: string
  savingsRate: number
}

export interface BudgetCategory {
  categoryId: string
  plannedAmount: number
  spent: number
}

export interface Wallet {
  id: string
  name: string
  balance: number
  currency: 'MWK' | 'USD'
  detail?: string
}

export interface ReconcileBalance {
  accountId: string
  expected: number
  actual: number
}

export interface Debt {
  id: string
  name: string
  direction: DebtDirection
  openingBalance: number
  remaining: number
  archived: boolean
}

export interface QuickAddInitial {
  transactionId?: string
  mode: TxnType
  amount?: number
  /** Amount currency when opening a new sheet with a native amount. */
  amountCurrency?: Account['currency']
  fxRate?: number
  categoryId?: string
  accountId?: string
  toAccountId?: string
  payee?: string
  sourceId?: string
  items?: string
  note?: string
  occurredAt?: number
  excludeFromBudget?: boolean
  autoSave?: true
  reconcile?: true
  fromSavings?: boolean
  debtId?: string
  claimAction?: ClaimAction
  adjustPolarity?: AdjustPolarity
}

export interface QuickAddPayload {
  transactionId?: string
  type: TxnType
  amount: number
  categoryId?: string
  accountId?: string
  toAccountId?: string
  payee: string
  sourceId?: string
  items?: string
  note?: string
  occurredAt?: number
  excludeFromBudget?: boolean
  reconcile?: true
  fromSavings?: boolean
  debtId?: string
  claimAction?: ClaimAction
  adjustPolarity?: AdjustPolarity
}

export type { OneTapRecent as RecentTransaction } from '../../shared/one-tap-recents'

export const USD_RATE = 1735

export const SPENDABLE_ACCOUNT_IDS = ['nbs', 'fdh', 'airtel', 'cash'] as const

export type SpendableAccountId = (typeof SPENDABLE_ACCOUNT_IDS)[number]

export function isSpendableAccount(account: Account | string) {
  if (typeof account !== 'string') {
    return account.includeInSpendable ?? account.kind !== 'investment'
  }
  return (SPENDABLE_ACCOUNT_IDS as readonly string[]).includes(account)
}

export function canMutateTransaction(
  transaction: Pick<Txn, 'adjustment' | 'autoSave' | 'type'>,
) {
  if (transaction.adjustment) return false
  if (transaction.autoSave) return true
  if (transaction.type === 'allocation') return false
  return true
}

export function canDeleteTransaction(
  transaction: Pick<Txn, 'adjustment' | 'autoSave' | 'type'>,
) {
  if (transaction.adjustment) return false
  return true
}

/** Prototype cycle copy and numbers — one source for UI strings and math. */
export const CYCLE = {
  spendingLimit: 650000,
  day: 11,
  days: 31,
  daysRemaining: 20,
  label: 'Jul cycle',
  dayOf: 'day 11 of 31',
  greetingDate: 'Thursday, 30 July',
  endsOn: '19 Aug',
  reconcileNote: 'Reconcile 30 Jul',
  lastClosed: 'last closed 26 Jul',
  headerBadge: 'Jul cycle · day 11',
  cycleGain: 112300,
} as const

export function accountKindColor(account: Account) {
  if (account.currency === 'USD' || account.kind === 'cash')
    return 'var(--palm)'
  if (account.kind === 'mobile') return 'var(--lagoon)'
  return 'var(--lagoon-deep)'
}

export const seedAccounts: Account[] = [
  {
    id: 'nbs',
    name: 'NBS Bank',
    kind: 'bank',
    currency: 'MWK',
    balance: 842100,
    archived: false,
  },
  {
    id: 'fdh',
    name: 'FDH Bank',
    kind: 'bank',
    currency: 'MWK',
    balance: 210450,
    archived: false,
  },
  {
    id: 'airtel',
    name: 'Airtel Money',
    kind: 'mobile',
    currency: 'MWK',
    balance: 96300,
    archived: false,
  },
  {
    id: 'cash',
    name: 'Cash',
    kind: 'cash',
    currency: 'MWK',
    balance: 38500,
    archived: false,
  },
  {
    id: 'unit-trust',
    name: 'Unit Trust',
    kind: 'investment',
    currency: 'MWK',
    balance: 1412000,
    archived: false,
  },
  {
    id: 'usd',
    name: 'USD Account',
    kind: 'investment',
    currency: 'USD',
    balance: 420,
    archived: false,
  },
]

export const seedReconcile: ReconcileBalance[] = [
  { accountId: 'nbs', expected: 842100, actual: 842100 },
  { accountId: 'fdh', expected: 210450, actual: 210450 },
  { accountId: 'airtel', expected: 96300, actual: 91800 },
  { accountId: 'cash', expected: 38500, actual: 38500 },
]

const usdFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export { formatK, formatKCompact } from '../../shared/money-format'

export function formatUsd(value: number) {
  const absolute = usdFormat.format(Math.abs(value))
  return `${value < 0 ? '-' : ''}$${absolute}`
}

export { currencyToMwk, mwkToCurrency } from '../../shared/fx'

export function formatAccountAmount(account: Account) {
  return account.currency === 'USD'
    ? `$${account.balance.toFixed(2)}`
    : formatK(account.balance)
}

export function accountMwkValue(account: Account, usdRate = USD_RATE) {
  return account.currency === 'USD'
    ? account.balance * usdRate
    : account.balance
}

export function spendableTotalMwk(accounts: Account[], usdRate = USD_RATE) {
  return accounts.reduce((sum, account) => {
    if (!isSpendableAccount(account)) return sum
    return sum + accountMwkValue(account, usdRate)
  }, 0)
}
