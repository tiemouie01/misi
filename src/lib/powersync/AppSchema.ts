import { Schema, Table, column } from '@powersync/web'

const categories = new Table(
  {
    userId: column.text,
    key: column.text,
    name: column.text,
    icon: column.text,
    color: column.text,
    budgetGroup: column.text,
    sortOrder: column.real,
    isSystem: column.integer,
    archivedAt: column.real,
  },
  { indexes: { userId: ['userId'] } },
)

const accounts = new Table({
  userId: column.text,
  name: column.text,
  kind: column.text,
  currency: column.text,
  balance: column.real,
  sortOrder: column.real,
})

const cycles = new Table({
  userId: column.text,
  label: column.text,
  startsAt: column.real,
  endsAt: column.real,
  spendingLimit: column.real,
})

const transactions = new Table(
  {
    userId: column.text,
    cycleUuid: column.text,
    type: column.text,
    amount: column.real,
    payee: column.text,
    categoryId: column.text,
    accountUuid: column.text,
    toAccountUuid: column.text,
    walletId: column.text,
    items: column.text,
    note: column.text,
    adjustment: column.integer,
    autoSave: column.integer,
    excludeFromBudget: column.integer,
    sourceUuid: column.text,
    occurredAt: column.real,
  },
  { indexes: { cycle: ['cycleUuid'], wallet: ['walletId'] } },
)

const budgets = new Table(
  {
    userId: column.text,
    cycleUuid: column.text,
    categoryId: column.text,
    plannedAmount: column.real,
  },
  { indexes: { cycle: ['cycleUuid'] } },
)

const incomeSources = new Table({
  userId: column.text,
  name: column.text,
  expectedDayStart: column.real,
  expectedDayEnd: column.real,
  expectedAmount: column.real,
  expectedAmountMax: column.real,
  savingsRate: column.real,
  isAnchor: column.integer,
  sortOrder: column.real,
  archivedAt: column.real,
})

const cycleIncomePlans = new Table(
  {
    userId: column.text,
    cycleUuid: column.text,
    sourceUuid: column.text,
    sourceName: column.text,
    expectedDayStart: column.real,
    expectedDayEnd: column.real,
    expectedAmount: column.real,
    expectedAmountMax: column.real,
    savingsRate: column.real,
    isAnchor: column.integer,
  },
  { indexes: { cycle: ['cycleUuid'] } },
)

const debts = new Table({
  userId: column.text,
  name: column.text,
  balance: column.real,
})

const settings = new Table({
  userId: column.text,
  usdRate: column.real,
  defaultSavingsRate: column.real,
  autoSaveSourceAccountUuid: column.text,
  defaultExpenseAccountUuid: column.text,
  defaultTransferFromAccountUuid: column.text,
  defaultTransferToAccountUuid: column.text,
  savingsOpeningBalance: column.real,
  paydayDay: column.real,
  onboardedAt: column.real,
})

const autoSaveEvents = new Table({
  userId: column.text,
  transactionUuid: column.text,
  status: column.text,
  amount: column.real,
})

export const AppSchema = new Schema({
  categories,
  accounts,
  cycles,
  transactions,
  budgets,
  incomeSources,
  cycleIncomePlans,
  debts,
  settings,
  autoSaveEvents,
})

export type Database = (typeof AppSchema)['types']
export type CategoryRecord = Database['categories']
export type AccountRecord = Database['accounts']
export type CycleRecord = Database['cycles']
export type TransactionRecord = Database['transactions']
export type BudgetRecord = Database['budgets']
export type IncomeSourceRecord = Database['incomeSources']
export type CycleIncomePlanRecord = Database['cycleIncomePlans']
export type DebtRecord = Database['debts']
export type SettingsRecord = Database['settings']
export type AutoSaveEventRecord = Database['autoSaveEvents']
