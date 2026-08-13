import { CATEGORY_COLORS, CATEGORY_ICONS } from '#/lib/categories'

import { DEFAULT_PAYDAY_DAY, getCyclePeriod } from './cycles'

import type { AbstractPowerSyncDatabase } from '@powersync/web'
import type {
  AccountRow,
  AutoSaveEventRow,
  BudgetGroup,
  BudgetRow,
  CategoryRow,
  CycleIncomePlanRow,
  CycleRow,
  IncomeSourceRow,
  SettingsRow,
  TransactionRow,
  TransactionType,
} from './types'

type Tx = Parameters<
  Parameters<AbstractPowerSyncDatabase['writeTransaction']>[0]
>[0]

type TransactionInput = {
  type: TransactionType
  amount: number
  categoryId?: string
  accountId: string
  toAccountId?: string
  sourceId?: string
  excludeFromBudget?: boolean
}

type AddTransactionInput = TransactionInput & {
  payee: string
  items?: string
  note?: string
  occurredAt?: number
}

type UpdateTransactionInput = TransactionInput & {
  transactionId: string
  payee: string
  items?: string
  note?: string
  occurredAt: number
}

type CategoryPlanInput = {
  categoryId: string
  plannedAmount: number
}

type CycleIncomePlanInput = {
  sourceId: string
  expectedAmount: number
  expectedAmountMax?: number
  savingsRate: number
}

type IncomeSourceInput = {
  id?: string
  name: string
  expectedDayStart: number
  expectedDayEnd: number
  expectedAmount: number
  expectedAmountMax?: number
  savingsRate: number
  isAnchor: boolean
}

function assertPositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number')
  }
}

function assertNonnegativeFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be zero or more`)
  }
}

function boolToInt(value: boolean): 0 | 1 {
  return value ? 1 : 0
}

function asBool(value: number | null | undefined): boolean {
  return value === 1
}

async function getSettings(tx: Tx): Promise<SettingsRow | null> {
  return await tx.getOptional<SettingsRow>('SELECT * FROM settings LIMIT 1')
}

async function requireSettings(tx: Tx): Promise<SettingsRow> {
  const settings = await getSettings(tx)
  if (!settings) {
    throw new Error('Settings not found; run ensureSeedData first')
  }
  return settings
}

async function getCategories(tx: Tx): Promise<CategoryRow[]> {
  const categories = await tx.getAll<CategoryRow>('SELECT * FROM categories')
  return categories.sort((a, b) => a.sortOrder - b.sortOrder)
}

async function requireAccount(tx: Tx, accountId: string): Promise<AccountRow> {
  const account = await tx.getOptional<AccountRow>(
    'SELECT * FROM accounts WHERE id = ?',
    [accountId],
  )
  if (!account) throw new Error('Account not found')
  return account
}

async function requireTransaction(
  tx: Tx,
  transactionId: string,
): Promise<TransactionRow> {
  const transaction = await tx.getOptional<TransactionRow>(
    'SELECT * FROM transactions WHERE id = ?',
    [transactionId],
  )
  if (!transaction) throw new Error('Transaction not found')
  return transaction
}

async function requireCycle(tx: Tx, cycleUuid: string): Promise<CycleRow> {
  const cycle = await tx.getOptional<CycleRow>(
    'SELECT * FROM cycles WHERE id = ?',
    [cycleUuid],
  )
  if (!cycle) throw new Error('Cycle not found')
  return cycle
}

async function requireOwnedCategory(
  tx: Tx,
  id: string,
): Promise<CategoryRow> {
  const category = await tx.getOptional<CategoryRow>(
    'SELECT * FROM categories WHERE id = ?',
    [id],
  )
  if (!category) throw new Error('Category not found')
  return category
}

async function getCycleIncomePlans(
  tx: Tx,
  cycleUuid: string,
): Promise<CycleIncomePlanRow[]> {
  return await tx.getAll<CycleIncomePlanRow>(
    'SELECT * FROM cycleIncomePlans WHERE cycleUuid = ?',
    [cycleUuid],
  )
}

async function isCategoryReferenced(tx: Tx, categoryKey: string) {
  const [transaction, budget] = await Promise.all([
    tx.getOptional<{ id: string }>(
      'SELECT id FROM transactions WHERE categoryId = ? LIMIT 1',
      [categoryKey],
    ),
    tx.getOptional<{ id: string }>(
      'SELECT id FROM budgets WHERE categoryId = ? LIMIT 1',
      [categoryKey],
    ),
  ])
  return transaction !== null || budget !== null
}

function validateCategoryName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Category name cannot be empty')
  return trimmed
}

function validateCategoryIcon(icon: string) {
  if (!CATEGORY_ICONS.some((entry) => entry.id === icon)) {
    throw new Error('Choose a valid category icon')
  }
}

function validateCategoryColor(color: string) {
  if (!CATEGORY_COLORS.some((entry) => entry.id === color)) {
    throw new Error('Choose a valid category color')
  }
}

async function assertUniqueCategoryName(
  tx: Tx,
  name: string,
  excludeId?: string,
) {
  const categories = await getCategories(tx)
  const duplicate = categories.some(
    (category) =>
      category.id !== excludeId &&
      category.archivedAt == null &&
      category.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw new Error('A category with this name already exists')
}

async function validateTransactionInput(tx: Tx, input: TransactionInput) {
  assertPositiveAmount(input.amount)
  await requireAccount(tx, input.accountId)

  if (input.type === 'expense') {
    if (!input.categoryId) {
      throw new Error('A category is required for expenses')
    }
    const category = (await getCategories(tx)).find(
      (candidate) => candidate.key === input.categoryId,
    )
    if (!category || category.archivedAt != null) {
      throw new Error('Expense category not found')
    }
  } else if (input.categoryId) {
    throw new Error('A category is only valid for expenses')
  }

  if (input.excludeFromBudget && input.type !== 'expense') {
    throw new Error('Only expenses can be excluded from the spending plan')
  }

  if (input.sourceId) {
    if (input.type !== 'income') {
      throw new Error('sourceId is only valid for income transactions')
    }
    const source = await tx.getOptional<IncomeSourceRow>(
      'SELECT * FROM incomeSources WHERE id = ?',
      [input.sourceId],
    )
    if (!source || source.archivedAt != null) {
      throw new Error('Income source not found')
    }
  }

  if (input.type === 'transfer') {
    if (!input.toAccountId) {
      throw new Error('A destination account is required for transfers')
    }
    if (input.toAccountId === input.accountId) {
      throw new Error('Transfer accounts must be different')
    }
    await requireAccount(tx, input.toAccountId)
  } else if (input.toAccountId) {
    throw new Error('A destination account is only valid for transfers')
  }
}

function getAccountBalanceImpacts(input: TransactionInput) {
  const impacts = new Map<string, number>()
  const addImpact = (accountId: string, amount: number) => {
    impacts.set(accountId, (impacts.get(accountId) ?? 0) + amount)
  }

  if (input.type === 'expense') {
    addImpact(input.accountId, -input.amount)
  } else if (input.type === 'income') {
    addImpact(input.accountId, input.amount)
  } else {
    if (!input.toAccountId) {
      throw new Error('A destination account is required for transfers')
    }
    addImpact(input.accountId, -input.amount)
    addImpact(input.toAccountId, input.amount)
  }

  return impacts
}

async function applyTransactionBalanceTransition(
  tx: Tx,
  previous: TransactionInput | null,
  next: TransactionInput | null,
) {
  const changes = new Map<string, number>()
  const addChange = (accountId: string, amount: number) => {
    changes.set(accountId, (changes.get(accountId) ?? 0) + amount)
  }

  if (previous) {
    for (const [accountId, amount] of getAccountBalanceImpacts(previous)) {
      addChange(accountId, -amount)
    }
  }
  if (next) {
    for (const [accountId, amount] of getAccountBalanceImpacts(next)) {
      addChange(accountId, amount)
    }
  }

  for (const [accountId, change] of changes) {
    if (change === 0) continue
    await requireAccount(tx, accountId)
    await tx.execute('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
      change,
      accountId,
    ])
  }
}

async function syncCycleIncomePlans(tx: Tx, cycleUuid: string) {
  const [existingPlans, allIncomeSources, cycle] = await Promise.all([
    getCycleIncomePlans(tx, cycleUuid),
    tx.getAll<IncomeSourceRow>('SELECT * FROM incomeSources'),
    requireCycle(tx, cycleUuid),
  ])
  const incomeSources = allIncomeSources.filter(
    (source) => source.archivedAt == null,
  )
  const existingSourceIds = new Set(existingPlans.map((plan) => plan.sourceUuid))

  for (const source of incomeSources) {
    if (existingSourceIds.has(source.id)) continue
    await tx.execute(
      `INSERT INTO cycleIncomePlans (
        id, userId, cycleUuid, sourceUuid, sourceName,
        expectedDayStart, expectedDayEnd, expectedAmount, expectedAmountMax,
        savingsRate, isAnchor
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        cycle.id,
        source.id,
        source.name,
        source.expectedDayStart,
        source.expectedDayEnd,
        source.expectedAmount,
        source.expectedAmountMax,
        source.savingsRate,
        source.isAnchor,
      ],
    )
  }
}

async function copyCyclePlans(
  tx: Tx,
  fromCycleUuid: string,
  toCycleUuid: string,
) {
  const [previousBudgets, previousIncomePlans] = await Promise.all([
    tx.getAll<BudgetRow>('SELECT * FROM budgets WHERE cycleUuid = ?', [
      fromCycleUuid,
    ]),
    getCycleIncomePlans(tx, fromCycleUuid),
  ])

  for (const budget of previousBudgets) {
    await tx.execute(
      `INSERT INTO budgets (id, userId, cycleUuid, categoryId, plannedAmount)
       VALUES (?, NULL, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        toCycleUuid,
        budget.categoryId,
        budget.plannedAmount,
      ],
    )
  }

  for (const plan of previousIncomePlans) {
    const source = await tx.getOptional<IncomeSourceRow>(
      'SELECT * FROM incomeSources WHERE id = ?',
      [plan.sourceUuid],
    )
    if (!source || source.archivedAt != null) continue
    await tx.execute(
      `INSERT INTO cycleIncomePlans (
        id, userId, cycleUuid, sourceUuid, sourceName,
        expectedDayStart, expectedDayEnd, expectedAmount, expectedAmountMax,
        savingsRate, isAnchor
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        toCycleUuid,
        plan.sourceUuid,
        source.name,
        source.expectedDayStart,
        source.expectedDayEnd,
        plan.expectedAmount,
        plan.expectedAmountMax,
        plan.savingsRate,
        source.isAnchor,
      ],
    )
  }
}

async function ensureCycleForDate(tx: Tx, occurredAt: number): Promise<CycleRow> {
  if (!Number.isFinite(occurredAt)) {
    throw new Error('Transaction date must be a finite number')
  }
  const settings = await getSettings(tx)
  const period = getCyclePeriod(
    occurredAt,
    settings?.paydayDay ?? DEFAULT_PAYDAY_DAY,
  )
  const cycles = await tx.getAll<CycleRow>('SELECT * FROM cycles')

  const matchingPeriod = cycles.find(
    (cycle) => cycle.startsAt === period.startsAt,
  )
  if (matchingPeriod) return matchingPeriod

  const covering = cycles.find(
    (cycle) => cycle.startsAt <= occurredAt && occurredAt <= cycle.endsAt,
  )
  if (covering) return covering

  const previousCycle =
    cycles
      .filter((cycle) => cycle.startsAt < period.startsAt)
      .sort((a, b) => b.startsAt - a.startsAt)
      .at(0) ?? null

  const cycleId = crypto.randomUUID()
  await tx.execute(
    `INSERT INTO cycles (id, userId, label, startsAt, endsAt, spendingLimit)
     VALUES (?, NULL, ?, ?, ?, ?)`,
    [
      cycleId,
      period.label,
      period.startsAt,
      period.endsAt,
      previousCycle?.spendingLimit ?? 0,
    ],
  )

  if (previousCycle) {
    await copyCyclePlans(tx, previousCycle.id, cycleId)
  }

  const cycle = await tx.getOptional<CycleRow>(
    'SELECT * FROM cycles WHERE id = ?',
    [cycleId],
  )
  if (!cycle) throw new Error('Failed to create cycle')

  await syncCycleIncomePlans(tx, cycle.id)
  return cycle
}

async function ensureCurrentCycle(tx: Tx): Promise<CycleRow> {
  return await ensureCycleForDate(tx, Date.now())
}

async function requireOwnedIncomeTransaction(
  tx: Tx,
  transactionId: string,
): Promise<TransactionRow> {
  const transaction = await tx.getOptional<TransactionRow>(
    'SELECT * FROM transactions WHERE id = ?',
    [transactionId],
  )
  if (!transaction || transaction.type !== 'income') {
    throw new Error('Income transaction not found')
  }
  return transaction
}

async function assertNoAutoSaveEvent(tx: Tx, transactionUuid: string) {
  const existing = await tx.getOptional<AutoSaveEventRow>(
    'SELECT * FROM autoSaveEvents WHERE transactionUuid = ? LIMIT 1',
    [transactionUuid],
  )
  if (existing) {
    throw new Error('Auto-save proposal has already been handled')
  }
}

async function validateCategoryPlans(tx: Tx, plans: CategoryPlanInput[]) {
  const categories = await getCategories(tx)
  const categoriesByKey = new Map(
    categories.map((category) => [category.key, category]),
  )
  const seen = new Set<string>()
  for (const plan of plans) {
    assertNonnegativeFinite(plan.plannedAmount, 'Planned amount')
    if (seen.has(plan.categoryId)) {
      throw new Error(`Duplicate category plan: ${plan.categoryId}`)
    }
    seen.add(plan.categoryId)
    if (!categoriesByKey.has(plan.categoryId)) {
      throw new Error(`Category not found: ${plan.categoryId}`)
    }
  }
}

function assertCategoryPlansFitLimit(
  plans: CategoryPlanInput[],
  spendingLimit: number,
) {
  const total = plans.reduce((sum, plan) => sum + plan.plannedAmount, 0)
  if (total > spendingLimit) {
    throw new Error('Category plans cannot exceed the spending limit')
  }
}

async function validateCycleIncomePlans(tx: Tx, plans: CycleIncomePlanInput[]) {
  const seen = new Set<string>()
  for (const plan of plans) {
    assertNonnegativeFinite(plan.expectedAmount, 'Expected income amount')
    if (
      plan.expectedAmountMax !== undefined &&
      (!Number.isFinite(plan.expectedAmountMax) ||
        plan.expectedAmountMax < plan.expectedAmount)
    ) {
      throw new Error(
        'Maximum expected income must be at least the expected amount',
      )
    }
    if (
      !Number.isFinite(plan.savingsRate) ||
      plan.savingsRate < 0 ||
      plan.savingsRate > 1
    ) {
      throw new Error('Savings rate must be between 0% and 100%')
    }
    if (seen.has(plan.sourceId)) {
      throw new Error(`Duplicate income plan: ${plan.sourceId}`)
    }
    seen.add(plan.sourceId)
    const source = await tx.getOptional<IncomeSourceRow>(
      'SELECT * FROM incomeSources WHERE id = ?',
      [plan.sourceId],
    )
    if (!source) throw new Error('Income source not found')
  }
}

function validateIncomeSources(incomeSources: IncomeSourceInput[]) {
  const seenNames = new Set<string>()
  for (const source of incomeSources) {
    const sourceName = source.name.trim()
    if (!sourceName) throw new Error('Income source names cannot be empty')
    const sourceKey = sourceName.toLowerCase()
    if (seenNames.has(sourceKey)) {
      throw new Error(`Duplicate income source: ${sourceName}`)
    }
    seenNames.add(sourceKey)
    if (
      !Number.isInteger(source.expectedDayStart) ||
      source.expectedDayStart < 1 ||
      source.expectedDayStart > 31 ||
      !Number.isInteger(source.expectedDayEnd) ||
      source.expectedDayEnd < source.expectedDayStart ||
      source.expectedDayEnd > 31
    ) {
      throw new Error('Income landing days must be between 1 and 31')
    }
    if (
      !Number.isFinite(source.expectedAmount) ||
      source.expectedAmount < 0 ||
      (source.expectedAmountMax !== undefined &&
        (!Number.isFinite(source.expectedAmountMax) ||
          source.expectedAmountMax < source.expectedAmount))
    ) {
      throw new Error('Expected income amounts must be valid and nonnegative')
    }
    if (
      !Number.isFinite(source.savingsRate) ||
      source.savingsRate < 0 ||
      source.savingsRate > 1
    ) {
      throw new Error('Income savings rates must be between 0% and 100%')
    }
  }
}

function transactionRowToInput(row: TransactionRow): TransactionInput {
  return {
    type: row.type,
    amount: row.amount,
    categoryId: row.categoryId ?? undefined,
    accountId: row.accountUuid,
    toAccountId: row.toAccountUuid ?? undefined,
    sourceId: row.sourceUuid ?? undefined,
    excludeFromBudget: asBool(row.excludeFromBudget),
  }
}

/**
 * Ports `api.misi.addTransaction` from convex/misi.ts.
 * `accountId` / `toAccountId` / `sourceId` are local uuid strings.
 */
export async function addTransaction(
  db: AbstractPowerSyncDatabase,
  input: AddTransactionInput,
): Promise<string> {
  return await db.writeTransaction(async (tx) => {
    const occurredAt = input.occurredAt ?? Date.now()
    await validateTransactionInput(tx, input)
    const cycle = await ensureCycleForDate(tx, occurredAt)
    const transactionId = crypto.randomUUID()

    await tx.execute(
      `INSERT INTO transactions (
        id, userId, cycleUuid, type, amount, payee, categoryId,
        accountUuid, toAccountUuid, walletId, items, note, adjustment,
        autoSave, excludeFromBudget, sourceUuid, occurredAt
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'spending', ?, ?, NULL, NULL, ?, ?, ?)`,
      [
        transactionId,
        cycle.id,
        input.type,
        input.amount,
        input.payee,
        input.categoryId ?? null,
        input.accountId,
        input.toAccountId ?? null,
        input.items ?? null,
        input.note ?? null,
        boolToInt(input.excludeFromBudget ?? false),
        input.sourceId ?? null,
        occurredAt,
      ],
    )

    await applyTransactionBalanceTransition(tx, null, input)
    return transactionId
  })
}

/**
 * Ports `api.misi.updateTransaction` from convex/misi.ts.
 * `transactionId` / account / source ids are local uuid strings.
 */
export async function updateTransaction(
  db: AbstractPowerSyncDatabase,
  input: UpdateTransactionInput,
): Promise<string> {
  return await db.writeTransaction(async (tx) => {
    const transaction = await requireTransaction(tx, input.transactionId)

    if (
      asBool(transaction.adjustment) ||
      asBool(transaction.autoSave) ||
      transaction.walletId !== 'spending'
    ) {
      throw new Error('Generated transactions cannot be edited')
    }

    if (transaction.type === 'income') {
      const autoSaveEvent = await tx.getOptional<AutoSaveEventRow>(
        'SELECT * FROM autoSaveEvents WHERE transactionUuid = ? LIMIT 1',
        [transaction.id],
      )
      if (autoSaveEvent) {
        throw new Error(
          'Income with a handled savings proposal cannot be edited',
        )
      }
    }

    await validateTransactionInput(tx, input)
    const cycle = await ensureCycleForDate(tx, input.occurredAt)
    const nextInput = {
      ...input,
      excludeFromBudget: input.excludeFromBudget ?? false,
    }
    await applyTransactionBalanceTransition(
      tx,
      transactionRowToInput(transaction),
      nextInput,
    )
    await tx.execute(
      `UPDATE transactions SET
        type = ?, amount = ?, payee = ?, categoryId = ?, accountUuid = ?,
        toAccountUuid = ?, items = ?, note = ?, sourceUuid = ?,
        excludeFromBudget = ?, cycleUuid = ?, occurredAt = ?
       WHERE id = ?`,
      [
        input.type,
        input.amount,
        input.payee,
        input.categoryId ?? null,
        input.accountId,
        input.toAccountId ?? null,
        input.items ?? null,
        input.note ?? null,
        input.sourceId ?? null,
        boolToInt(input.excludeFromBudget ?? false),
        cycle.id,
        input.occurredAt,
        transaction.id,
      ],
    )

    return transaction.id
  })
}

/**
 * Ports `api.misi.confirmAutoSave` from convex/misi.ts.
 */
export async function confirmAutoSave(
  db: AbstractPowerSyncDatabase,
  input: { transactionUuid: string; amount: number },
): Promise<string> {
  return await db.writeTransaction(async (tx) => {
    assertPositiveAmount(input.amount)

    const incomeTransaction = await requireOwnedIncomeTransaction(
      tx,
      input.transactionUuid,
    )
    const cycle = await ensureCurrentCycle(tx)

    if (incomeTransaction.cycleUuid !== cycle.id) {
      throw new Error('Income transaction is not in the current cycle')
    }

    if (input.amount > incomeTransaction.amount) {
      throw new Error('Auto-save amount cannot exceed income amount')
    }

    await assertNoAutoSaveEvent(tx, input.transactionUuid)
    const settings = await requireSettings(tx)

    if (!settings.autoSaveSourceAccountUuid) {
      throw new Error('Auto-save source account is not configured')
    }

    const sourceAccount = await requireAccount(
      tx,
      settings.autoSaveSourceAccountUuid,
    )
    const [source, cyclePlans] = await Promise.all([
      incomeTransaction.sourceUuid
        ? tx.getOptional<IncomeSourceRow>(
            'SELECT * FROM incomeSources WHERE id = ?',
            [incomeTransaction.sourceUuid],
          )
        : Promise.resolve(null),
      getCycleIncomePlans(tx, incomeTransaction.cycleUuid),
    ])
    const cyclePlan = incomeTransaction.sourceUuid
      ? cyclePlans.find(
          (plan) => plan.sourceUuid === incomeTransaction.sourceUuid,
        )
      : undefined
    const savingsRate =
      cyclePlan?.savingsRate ??
      source?.savingsRate ??
      settings.defaultSavingsRate

    const transactionId = crypto.randomUUID()
    await tx.execute(
      `INSERT INTO transactions (
        id, userId, cycleUuid, type, amount, payee, categoryId,
        accountUuid, toAccountUuid, walletId, items, note, adjustment,
        autoSave, excludeFromBudget, sourceUuid, occurredAt
      ) VALUES (?, NULL, ?, 'transfer', ?, ?, NULL, ?, NULL, 'savings', NULL, NULL, NULL, 1, 1, NULL, ?)`,
      [
        transactionId,
        incomeTransaction.cycleUuid,
        input.amount,
        `Auto-save — ${Math.round(savingsRate * 100)}% of income`,
        settings.autoSaveSourceAccountUuid,
        Date.now(),
      ],
    )
    await tx.execute('UPDATE accounts SET balance = ? WHERE id = ?', [
      sourceAccount.balance - input.amount,
      sourceAccount.id,
    ])
    await tx.execute(
      `INSERT INTO autoSaveEvents (id, userId, transactionUuid, status, amount)
       VALUES (?, NULL, ?, 'confirmed', ?)`,
      [crypto.randomUUID(), input.transactionUuid, input.amount],
    )

    return transactionId
  })
}

/**
 * Ports `api.misi.dismissAutoSave` from convex/misi.ts.
 */
export async function dismissAutoSave(
  db: AbstractPowerSyncDatabase,
  input: { transactionUuid: string; amount: number },
): Promise<string> {
  return await db.writeTransaction(async (tx) => {
    assertPositiveAmount(input.amount)

    const incomeTransaction = await requireOwnedIncomeTransaction(
      tx,
      input.transactionUuid,
    )
    const cycle = await ensureCurrentCycle(tx)

    if (incomeTransaction.cycleUuid !== cycle.id) {
      throw new Error('Income transaction is not in the current cycle')
    }

    await assertNoAutoSaveEvent(tx, input.transactionUuid)

    const eventId = crypto.randomUUID()
    await tx.execute(
      `INSERT INTO autoSaveEvents (id, userId, transactionUuid, status, amount)
       VALUES (?, NULL, ?, 'dismissed', ?)`,
      [eventId, input.transactionUuid, input.amount],
    )
    return eventId
  })
}

/**
 * Ports `api.misi.absorbAdjustment` from convex/misi.ts.
 * `accountUuid` is the local account uuid (Convex `accountId`).
 */
export async function absorbAdjustment(
  db: AbstractPowerSyncDatabase,
  input: { accountUuid: string; actual: number; note?: string },
): Promise<string | null> {
  return await db.writeTransaction(async (tx) => {
    const account = await requireAccount(tx, input.accountUuid)
    const delta = input.actual - account.balance

    if (delta === 0) return null

    const cycle = await ensureCurrentCycle(tx)
    const type = delta < 0 ? 'expense' : 'income'
    const transactionId = crypto.randomUUID()

    await tx.execute(
      `INSERT INTO transactions (
        id, userId, cycleUuid, type, amount, payee, categoryId,
        accountUuid, toAccountUuid, walletId, items, note, adjustment,
        autoSave, excludeFromBudget, sourceUuid, occurredAt
      ) VALUES (?, NULL, ?, ?, ?, 'Balance adjustment', ?, ?, NULL, 'spending', NULL, ?, 1, NULL, 1, NULL, ?)`,
      [
        transactionId,
        cycle.id,
        type,
        Math.abs(delta),
        type === 'expense' ? 'adjustment' : null,
        account.id,
        input.note ?? null,
        Date.now(),
      ],
    )
    await tx.execute('UPDATE accounts SET balance = ? WHERE id = ?', [
      input.actual,
      account.id,
    ])

    return transactionId
  })
}

/**
 * Ports `api.misi.saveCyclePlan` from convex/misi.ts.
 * `cycleUuid` and income plan `sourceId` values are local uuids.
 */
export async function saveCyclePlan(
  db: AbstractPowerSyncDatabase,
  input: {
    cycleUuid: string
    spendingLimit: number
    categoryPlans: CategoryPlanInput[]
    incomePlans?: CycleIncomePlanInput[]
  },
): Promise<{
  cycleUuid: string
  spendingLimit: number
  categoryPlanCount: number
  incomePlanCount: number
}> {
  return await db.writeTransaction(async (tx) => {
    const cycle = await requireCycle(tx, input.cycleUuid)
    if (cycle.endsAt < Date.now()) {
      throw new Error('Closed cycle plans cannot be edited')
    }
    assertNonnegativeFinite(input.spendingLimit, 'Spending limit')
    await validateCategoryPlans(tx, input.categoryPlans)
    assertCategoryPlansFitLimit(input.categoryPlans, input.spendingLimit)
    if (input.incomePlans !== undefined) {
      await validateCycleIncomePlans(tx, input.incomePlans)
    }

    const existingBudgets = await tx.getAll<BudgetRow>(
      'SELECT * FROM budgets WHERE cycleUuid = ?',
      [cycle.id],
    )
    for (const budget of existingBudgets) {
      await tx.execute('DELETE FROM budgets WHERE id = ?', [budget.id])
    }
    for (const plan of input.categoryPlans) {
      await tx.execute(
        `INSERT INTO budgets (id, userId, cycleUuid, categoryId, plannedAmount)
         VALUES (?, NULL, ?, ?, ?)`,
        [crypto.randomUUID(), cycle.id, plan.categoryId, plan.plannedAmount],
      )
    }
    await tx.execute('UPDATE cycles SET spendingLimit = ? WHERE id = ?', [
      input.spendingLimit,
      cycle.id,
    ])

    if (input.incomePlans !== undefined) {
      const existingIncomePlans = await getCycleIncomePlans(tx, cycle.id)
      for (const plan of existingIncomePlans) {
        await tx.execute('DELETE FROM cycleIncomePlans WHERE id = ?', [plan.id])
      }
      for (const plan of input.incomePlans) {
        const source = await tx.getOptional<IncomeSourceRow>(
          'SELECT * FROM incomeSources WHERE id = ?',
          [plan.sourceId],
        )
        if (!source) throw new Error('Income source not found')
        await tx.execute(
          `INSERT INTO cycleIncomePlans (
            id, userId, cycleUuid, sourceUuid, sourceName,
            expectedDayStart, expectedDayEnd, expectedAmount, expectedAmountMax,
            savingsRate, isAnchor
          ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            cycle.id,
            plan.sourceId,
            source.name,
            source.expectedDayStart,
            source.expectedDayEnd,
            plan.expectedAmount,
            plan.expectedAmountMax ?? null,
            plan.savingsRate,
            source.isAnchor,
          ],
        )
      }
    } else {
      await syncCycleIncomePlans(tx, cycle.id)
    }

    const incomePlanCount =
      input.incomePlans?.length ??
      (await getCycleIncomePlans(tx, cycle.id)).length

    return {
      cycleUuid: cycle.id,
      spendingLimit: input.spendingLimit,
      categoryPlanCount: input.categoryPlans.length,
      incomePlanCount,
    }
  })
}

/**
 * Ports `api.misi.updateIncomeSources` from convex/misi.ts.
 * Optional `id` on each source is the local incomeSources uuid.
 */
export async function updateIncomeSources(
  db: AbstractPowerSyncDatabase,
  input: { incomeSources: IncomeSourceInput[] },
): Promise<void> {
  await db.writeTransaction(async (tx) => {
    validateIncomeSources(input.incomeSources)

    const existingSources = await tx.getAll<IncomeSourceRow>(
      'SELECT * FROM incomeSources',
    )
    const existingById = new Map(
      existingSources.map((source) => [source.id, source]),
    )
    const keptIds = new Set<string>()

    for (const [sortOrder, sourceInput] of input.incomeSources.entries()) {
      const existing = sourceInput.id
        ? existingById.get(sourceInput.id)
        : undefined
      if (sourceInput.id && !existing) {
        throw new Error('Income source not found')
      }
      const values = {
        name: sourceInput.name.trim(),
        expectedDayStart: sourceInput.expectedDayStart,
        expectedDayEnd: sourceInput.expectedDayEnd,
        expectedAmount: sourceInput.expectedAmount,
        expectedAmountMax: sourceInput.expectedAmountMax ?? null,
        savingsRate: sourceInput.savingsRate,
        isAnchor: boolToInt(sourceInput.isAnchor),
        sortOrder,
      }
      if (existing) {
        await tx.execute(
          `UPDATE incomeSources SET
            name = ?, expectedDayStart = ?, expectedDayEnd = ?,
            expectedAmount = ?, expectedAmountMax = ?, savingsRate = ?,
            isAnchor = ?, sortOrder = ?, archivedAt = NULL
           WHERE id = ?`,
          [
            values.name,
            values.expectedDayStart,
            values.expectedDayEnd,
            values.expectedAmount,
            values.expectedAmountMax,
            values.savingsRate,
            values.isAnchor,
            values.sortOrder,
            existing.id,
          ],
        )
        keptIds.add(existing.id)
      } else {
        const id = crypto.randomUUID()
        await tx.execute(
          `INSERT INTO incomeSources (
            id, userId, name, expectedDayStart, expectedDayEnd,
            expectedAmount, expectedAmountMax, savingsRate, isAnchor,
            sortOrder, archivedAt
          ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
          [
            id,
            values.name,
            values.expectedDayStart,
            values.expectedDayEnd,
            values.expectedAmount,
            values.expectedAmountMax,
            values.savingsRate,
            values.isAnchor,
            values.sortOrder,
          ],
        )
        keptIds.add(id)
      }
    }

    const referencedIds = new Set<string>()
    const [transactions, allPlans] = await Promise.all([
      tx.getAll<TransactionRow>('SELECT * FROM transactions'),
      tx.getAll<CycleIncomePlanRow>('SELECT * FROM cycleIncomePlans'),
    ])
    for (const transaction of transactions) {
      if (transaction.sourceUuid) referencedIds.add(transaction.sourceUuid)
    }
    for (const plan of allPlans) referencedIds.add(plan.sourceUuid)

    for (const source of existingSources) {
      if (keptIds.has(source.id)) continue
      if (referencedIds.has(source.id)) {
        await tx.execute(
          'UPDATE incomeSources SET archivedAt = ? WHERE id = ?',
          [Date.now(), source.id],
        )
      } else {
        await tx.execute('DELETE FROM incomeSources WHERE id = ?', [source.id])
      }
    }

    const cycle = await ensureCurrentCycle(tx)
    const currentPlans = await getCycleIncomePlans(tx, cycle.id)
    for (const plan of currentPlans) {
      await tx.execute('DELETE FROM cycleIncomePlans WHERE id = ?', [plan.id])
    }
    const activeSources = (
      await tx.getAll<IncomeSourceRow>('SELECT * FROM incomeSources')
    )
      .filter((source) => source.archivedAt == null)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    for (const source of activeSources) {
      await tx.execute(
        `INSERT INTO cycleIncomePlans (
          id, userId, cycleUuid, sourceUuid, sourceName,
          expectedDayStart, expectedDayEnd, expectedAmount, expectedAmountMax,
          savingsRate, isAnchor
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          cycle.id,
          source.id,
          source.name,
          source.expectedDayStart,
          source.expectedDayEnd,
          source.expectedAmount,
          source.expectedAmountMax,
          source.savingsRate,
          source.isAnchor,
        ],
      )
    }
  })
}

/**
 * Ports `api.misi.createCategory` from convex/misi.ts.
 */
export async function createCategory(
  db: AbstractPowerSyncDatabase,
  input: {
    name: string
    icon: string
    color: string
    budgetGroup: BudgetGroup
  },
): Promise<CategoryRow> {
  return await db.writeTransaction(async (tx) => {
    const name = validateCategoryName(input.name)
    validateCategoryIcon(input.icon)
    validateCategoryColor(input.color)
    await assertUniqueCategoryName(tx, name)

    const categories = await getCategories(tx)
    const sortOrder =
      categories.reduce(
        (highest, category) => Math.max(highest, category.sortOrder),
        -1,
      ) + 1
    const id = crypto.randomUUID()
    await tx.execute(
      `INSERT INTO categories (
        id, userId, key, name, icon, color, budgetGroup, sortOrder,
        isSystem, archivedAt
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 0, NULL)`,
      [
        id,
        crypto.randomUUID(),
        name,
        input.icon,
        input.color,
        input.budgetGroup,
        sortOrder,
      ],
    )
    const created = await tx.getOptional<CategoryRow>(
      'SELECT * FROM categories WHERE id = ?',
      [id],
    )
    if (!created) throw new Error('Category not found')
    return created
  })
}

/**
 * Ports `api.misi.updateCategory` from convex/misi.ts.
 */
export async function updateCategory(
  db: AbstractPowerSyncDatabase,
  input: {
    id: string
    name?: string
    icon?: string
    color?: string
    budgetGroup?: BudgetGroup
  },
): Promise<CategoryRow> {
  return await db.writeTransaction(async (tx) => {
    const category = await requireOwnedCategory(tx, input.id)

    if (asBool(category.isSystem) && input.name !== undefined) {
      throw new Error('System categories cannot be renamed')
    }
    const name =
      input.name === undefined ? undefined : validateCategoryName(input.name)
    if (input.icon !== undefined) validateCategoryIcon(input.icon)
    if (input.color !== undefined) validateCategoryColor(input.color)
    if (name !== undefined) {
      await assertUniqueCategoryName(tx, name, category.id)
    }

    await tx.execute(
      `UPDATE categories SET
        name = ?, icon = ?, color = ?, budgetGroup = ?
       WHERE id = ?`,
      [
        name ?? category.name,
        input.icon ?? category.icon,
        input.color ?? category.color,
        input.budgetGroup ?? category.budgetGroup,
        category.id,
      ],
    )
    const updated = await tx.getOptional<CategoryRow>(
      'SELECT * FROM categories WHERE id = ?',
      [category.id],
    )
    if (!updated) throw new Error('Category not found')
    return updated
  })
}

/**
 * Ports `api.misi.deleteCategory` from convex/misi.ts.
 * Archives when referenced; deletes otherwise.
 */
export async function deleteCategory(
  db: AbstractPowerSyncDatabase,
  input: { id: string },
): Promise<{ archived: boolean }> {
  return await db.writeTransaction(async (tx) => {
    const category = await requireOwnedCategory(tx, input.id)
    if (asBool(category.isSystem)) {
      throw new Error('System categories cannot be deleted')
    }

    if (await isCategoryReferenced(tx, category.key)) {
      await tx.execute(
        'UPDATE categories SET archivedAt = ? WHERE id = ?',
        [Date.now(), category.id],
      )
      return { archived: true }
    }

    await tx.execute('DELETE FROM categories WHERE id = ?', [category.id])
    return { archived: false }
  })
}

/**
 * Ports `api.misi.restoreCategory` from convex/misi.ts.
 */
export async function restoreCategory(
  db: AbstractPowerSyncDatabase,
  input: { id: string },
): Promise<CategoryRow> {
  return await db.writeTransaction(async (tx) => {
    const category = await requireOwnedCategory(tx, input.id)
    await assertUniqueCategoryName(tx, category.name, category.id)
    await tx.execute(
      'UPDATE categories SET archivedAt = NULL WHERE id = ?',
      [category.id],
    )
    const restored = await tx.getOptional<CategoryRow>(
      'SELECT * FROM categories WHERE id = ?',
      [category.id],
    )
    if (!restored) throw new Error('Category not found')
    return restored
  })
}
