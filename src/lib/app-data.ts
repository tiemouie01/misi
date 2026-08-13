export interface Account {
  id: string
  name: string
  kind: 'bank' | 'mobile' | 'cash' | 'investment'
  currency: 'MWK' | 'USD'
  balance: number
}

export type TxnType = 'expense' | 'income' | 'transfer'

export interface Txn {
  id: string
  type: TxnType
  amount: number
  payee: string
  categoryId?: string
  accountId: string
  toAccountId?: string
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

export interface QuickAddInitial {
  transactionId?: string
  mode: TxnType
  amount?: number
  categoryId?: string
  accountId?: string
  toAccountId?: string
  payee?: string
  sourceId?: string
  items?: string
  note?: string
  occurredAt?: number
  excludeFromBudget?: boolean
  reconcile?: true
}

export interface QuickAddPayload {
  transactionId?: string
  type: TxnType
  amount: number
  categoryId?: string
  accountId: string
  toAccountId?: string
  payee: string
  sourceId?: string
  items?: string
  note?: string
  occurredAt?: number
  excludeFromBudget?: boolean
  reconcile?: true
}

export interface RecentTransaction {
  payee: string
  amount: number
  categoryId: string
  accountId: string
}

export const USD_RATE = 1735

export const SPENDABLE_ACCOUNT_IDS = ['nbs', 'fdh', 'airtel', 'cash'] as const

export type SpendableAccountId = (typeof SPENDABLE_ACCOUNT_IDS)[number]

export function isSpendableAccount(account: Account | string) {
  if (typeof account !== 'string') return account.kind !== 'investment'
  return (SPENDABLE_ACCOUNT_IDS as readonly string[]).includes(account)
}

export function canMutateTransaction(
  transaction: Pick<Txn, 'adjustment' | 'autoSave' | 'walletId'>,
) {
  return (
    !transaction.adjustment &&
    !transaction.autoSave &&
    transaction.walletId === 'spending'
  )
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
  },
  {
    id: 'fdh',
    name: 'FDH Bank',
    kind: 'bank',
    currency: 'MWK',
    balance: 210450,
  },
  {
    id: 'airtel',
    name: 'Airtel Money',
    kind: 'mobile',
    currency: 'MWK',
    balance: 96300,
  },
  {
    id: 'cash',
    name: 'Cash',
    kind: 'cash',
    currency: 'MWK',
    balance: 38500,
  },
  {
    id: 'unit-trust',
    name: 'Unit Trust',
    kind: 'investment',
    currency: 'MWK',
    balance: 1412000,
  },
  {
    id: 'usd',
    name: 'USD Account',
    kind: 'investment',
    currency: 'USD',
    balance: 420,
  },
]

export const oneTapRecents: RecentTransaction[] = [
  {
    payee: 'Minibus',
    amount: 3500,
    categoryId: 'transport',
    accountId: 'airtel',
  },
  {
    payee: 'Airtime',
    amount: 5000,
    categoryId: 'airtime',
    accountId: 'airtel',
  },
  {
    payee: 'Chipiku',
    amount: 42000,
    categoryId: 'groceries',
    accountId: 'nbs',
  },
]

export const seedReconcile: ReconcileBalance[] = [
  { accountId: 'nbs', expected: 842100, actual: 842100 },
  { accountId: 'fdh', expected: 210450, actual: 210450 },
  { accountId: 'airtel', expected: 96300, actual: 91800 },
  { accountId: 'cash', expected: 38500, actual: 38500 },
]

export function formatK(value: number) {
  const absolute = Math.abs(value).toLocaleString('en-US')
  return `${value < 0 ? '-' : ''}K${absolute}`
}

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
