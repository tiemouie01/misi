/** Row types for the local PowerSync SQLite tables (mirrors AppSchema). */

export type TransactionType = 'expense' | 'income' | 'transfer'
export type AccountKind = 'bank' | 'mobile' | 'cash' | 'investment'
export type CurrencyCode = 'MWK' | 'USD'
export type BudgetGroup = 'needs' | 'wants'
export type AutoSaveStatus = 'confirmed' | 'dismissed'
export type SqliteBool = 0 | 1

export type CategoryRow = {
  id: string
  userId: string | null
  key: string
  name: string
  icon: string
  color: string
  budgetGroup: BudgetGroup
  sortOrder: number
  isSystem: SqliteBool
  archivedAt: number | null
}

export type AccountRow = {
  id: string
  userId: string | null
  name: string
  kind: AccountKind
  currency: CurrencyCode
  balance: number
  sortOrder: number
}

export type CycleRow = {
  id: string
  userId: string | null
  label: string
  startsAt: number
  endsAt: number
  spendingLimit: number
}

export type TransactionRow = {
  id: string
  userId: string | null
  cycleUuid: string
  type: TransactionType
  amount: number
  payee: string
  categoryId: string | null
  accountUuid: string
  toAccountUuid: string | null
  walletId: string
  items: string | null
  note: string | null
  adjustment: SqliteBool | null
  autoSave: SqliteBool | null
  excludeFromBudget: SqliteBool
  sourceUuid: string | null
  occurredAt: number
}

export type BudgetRow = {
  id: string
  userId: string | null
  cycleUuid: string
  categoryId: string
  plannedAmount: number
}

export type IncomeSourceRow = {
  id: string
  userId: string | null
  name: string
  expectedDayStart: number
  expectedDayEnd: number
  expectedAmount: number
  expectedAmountMax: number | null
  savingsRate: number
  isAnchor: SqliteBool
  sortOrder: number
  archivedAt: number | null
}

export type CycleIncomePlanRow = {
  id: string
  userId: string | null
  cycleUuid: string
  sourceUuid: string
  sourceName: string
  expectedDayStart: number
  expectedDayEnd: number
  expectedAmount: number
  expectedAmountMax: number | null
  savingsRate: number
  isAnchor: SqliteBool
}

export type DebtRow = {
  id: string
  userId: string | null
  name: string
  balance: number
}

export type SettingsRow = {
  id: string
  userId: string | null
  usdRate: number
  defaultSavingsRate: number
  autoSaveSourceAccountUuid: string | null
  defaultExpenseAccountUuid: string | null
  defaultTransferFromAccountUuid: string | null
  defaultTransferToAccountUuid: string | null
  savingsOpeningBalance: number
  paydayDay: number | null
  onboardedAt: number | null
}

export type AutoSaveEventRow = {
  id: string
  userId: string | null
  transactionUuid: string
  status: AutoSaveStatus
  amount: number
}
