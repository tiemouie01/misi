import {
  Bus,
  HeartPulse,
  PlugZap,
  Scale,
  ShoppingBasket,
  Smartphone,
  UtensilsCrossed,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

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
  items?: string
  note?: string
  day: string
  reconcile?: true
  adjustment?: true
  /** Set on transactions created in the current session (not seed data). */
  provisional?: true
}

export interface Category {
  id: string
  name: string
  icon: LucideIcon
  color: string
}

export interface IncomeSource {
  id: string
  name: string
  expected: string
  amountLabel: string
  status: 'landed' | 'pending'
  statusNote: string
  splitPct: number
}

export interface BudgetCategory {
  categoryId: string
  budget: number
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
  mode: TxnType
  amount?: number
  categoryId?: string
  accountId?: string
  toAccountId?: string
  payee?: string
  reconcile?: true
}

export interface QuickAddPayload {
  type: TxnType
  amount: number
  categoryId?: string
  accountId: string
  toAccountId?: string
  payee: string
  items?: string
  note?: string
  reconcile?: true
}

export interface RecentTransaction {
  payee: string
  amount: number
  categoryId: string
  accountId: string
}

export const USD_RATE = 1735
export const AUTO_SAVE_RATE = 0.2
export const AUTO_SAVE_SOURCE_ACCOUNT_ID = 'nbm'
export const DEFAULT_EXPENSE_ACCOUNT_ID = 'airtel'
export const DEFAULT_TRANSFER_FROM_ACCOUNT_ID = 'nbm'
export const DEFAULT_TRANSFER_TO_ACCOUNT_ID = 'cash'
export const INITIAL_CYCLE_SPEND = 358000
export const INITIAL_SAVINGS_BALANCE = 315000
export const INITIAL_AUTO_SAVE_AMOUNT = 370000

export const SPENDABLE_ACCOUNT_IDS = [
  'nbm',
  'fdh',
  'airtel',
  'cash',
] as const

export type SpendableAccountId = (typeof SPENDABLE_ACCOUNT_IDS)[number]

export function isSpendableAccount(id: string): id is SpendableAccountId {
  return (SPENDABLE_ACCOUNT_IDS as readonly string[]).includes(id)
}

/** Prototype cycle copy and numbers — one source for UI strings and math. */
export const CYCLE = {
  budget: 650000,
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

export const CYCLE_BUDGET = CYCLE.budget
export const CYCLE_DAY = CYCLE.day
export const CYCLE_DAYS = CYCLE.days
export const CYCLE_DAYS_REMAINING = CYCLE.daysRemaining

export function autoSaveAmount(income: number) {
  return Math.round(income * AUTO_SAVE_RATE)
}

export function autoSaveRateLabel() {
  return `${Math.round(AUTO_SAVE_RATE * 100)}%`
}

export function accountKindColor(account: Account) {
  if (account.currency === 'USD' || account.kind === 'cash') return 'var(--palm)'
  if (account.kind === 'mobile') return 'var(--lagoon)'
  return 'var(--lagoon-deep)'
}

export const seedAccounts: Account[] = [
  {
    id: 'nbm',
    name: 'NBM Bank',
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

export const seedWallets: Wallet[] = [
  {
    id: 'spending',
    name: 'Spending',
    balance: 292000,
    currency: 'MWK',
    detail: 'K292,000 left of K650,000',
  },
  {
    id: 'savings',
    name: 'Savings',
    balance: INITIAL_SAVINGS_BALANCE,
    currency: 'MWK',
  },
  {
    id: 'unit-trust',
    name: 'Unit Trust',
    balance: 1412000,
    currency: 'MWK',
  },
  { id: 'usd', name: 'USD', balance: 420, currency: 'USD' },
  {
    id: 'debt',
    name: 'Chisomo',
    balance: 50000,
    currency: 'MWK',
  },
]

export const categories: Category[] = [
  {
    id: 'groceries',
    name: 'Groceries',
    icon: ShoppingBasket,
    color: 'var(--palm)',
  },
  {
    id: 'transport',
    name: 'Minibus & transport',
    icon: Bus,
    color: 'var(--lagoon-deep)',
  },
  {
    id: 'eating-out',
    name: 'Eating out',
    icon: UtensilsCrossed,
    color: 'var(--coral)',
  },
  {
    id: 'airtime',
    name: 'Airtime & data',
    icon: Smartphone,
    color: 'var(--lagoon)',
  },
  {
    id: 'utilities',
    name: 'Utilities',
    icon: PlugZap,
    color: 'var(--lagoon-deep)',
  },
  {
    id: 'health',
    name: 'Health',
    icon: HeartPulse,
    color: 'var(--palm)',
  },
  {
    id: 'adjustment',
    name: 'Adjustment',
    icon: Scale,
    color: 'var(--coral)',
  },
]

export const seedBudgets: BudgetCategory[] = [
  { categoryId: 'groceries', budget: 220000, spent: 132400 },
  { categoryId: 'transport', budget: 90000, spent: 61500 },
  { categoryId: 'eating-out', budget: 60000, spent: 44000 },
  { categoryId: 'airtime', budget: 30000, spent: 18200 },
  { categoryId: 'utilities', budget: 80000, spent: 52000 },
]

export const incomeSources: IncomeSource[] = [
  {
    id: 'salary',
    name: 'Salary',
    expected: '20th',
    amountLabel: 'K1,850,000',
    status: 'landed',
    statusNote: 'Landed 20 Jul',
    splitPct: 20,
  },
  {
    id: 'allowance',
    name: 'Allowance',
    expected: '10th',
    amountLabel: 'K150,000',
    status: 'landed',
    statusNote: 'Landed 10 Jul · saved 50%',
    splitPct: 50,
  },
  {
    id: 'secondary',
    name: 'Secondary income',
    expected: '24th–30th',
    amountLabel: 'K300,000 – 450,000',
    status: 'pending',
    statusNote: 'Due by today',
    splitPct: 20,
  },
]

export const seedTransactions: Txn[] = [
  {
    id: 'txn-minibus',
    type: 'expense',
    amount: 3500,
    payee: 'Minibus',
    categoryId: 'transport',
    accountId: 'airtel',
    walletId: 'spending',
    day: 'Today',
  },
  {
    id: 'txn-chipiku',
    type: 'expense',
    amount: 42800,
    payee: 'Chipiku',
    categoryId: 'groceries',
    accountId: 'nbm',
    walletId: 'spending',
    items: 'milk, bread, eggs',
    day: 'Today',
  },
  {
    id: 'txn-airtime',
    type: 'expense',
    amount: 5000,
    payee: 'Airtime',
    categoryId: 'airtime',
    accountId: 'airtel',
    walletId: 'spending',
    day: 'Yesterday',
  },
  {
    id: 'txn-cafe',
    type: 'expense',
    amount: 12500,
    payee: 'Café City Mall',
    categoryId: 'eating-out',
    accountId: 'cash',
    walletId: 'spending',
    day: 'Yesterday',
  },
  {
    id: 'txn-withdrawal',
    type: 'transfer',
    amount: 40000,
    payee: 'Cash withdrawal',
    accountId: 'nbm',
    toAccountId: 'cash',
    walletId: 'spending',
    day: 'Tue 28 Jul',
  },
  {
    id: 'txn-escom',
    type: 'expense',
    amount: 32000,
    payee: 'ESCOM units',
    categoryId: 'utilities',
    accountId: 'nbm',
    walletId: 'spending',
    day: 'Mon 27 Jul',
  },
  {
    id: 'txn-game',
    type: 'expense',
    amount: 38900,
    payee: 'Game Stores',
    categoryId: 'groceries',
    accountId: 'nbm',
    walletId: 'spending',
    items: 'maize flour, cooking oil',
    day: 'Sat 26 Jul',
  },
  {
    id: 'txn-fuel',
    type: 'expense',
    amount: 45000,
    payee: 'Fuel',
    categoryId: 'transport',
    accountId: 'nbm',
    walletId: 'spending',
    day: 'Thu 24 Jul',
  },
  {
    id: 'txn-salary',
    type: 'income',
    amount: 1850000,
    payee: 'Salary — July',
    accountId: 'nbm',
    walletId: 'spending',
    day: 'Mon 20 Jul',
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
    accountId: 'nbm',
  },
]

export const seedReconcile: ReconcileBalance[] = [
  { accountId: 'nbm', expected: 842100, actual: 842100 },
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

export function accountMwkValue(account: Account) {
  return account.currency === 'USD'
    ? account.balance * USD_RATE
    : account.balance
}
