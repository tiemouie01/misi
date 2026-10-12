import { useState } from 'react'

import {
  claimActionLabel,
  claimAllowsFromSavings,
  claimForbidsAccount,
  claimRequiresAccount,
  defaultClaimAction,
  remainingAfterReplacement,
} from '@misi/shared/claim'
import { currencyToMwk, mwkToCurrency } from '#/lib/app-data'
import {
  amountToDigits,
  appendAmountInput,
  defaultIncomeSourceId,
  findCategory,
  firstExpenseCategoryKey,
  formatAmountDigitsDisplay,
  formatEnteredAmount,
  formatTransactionDate,
  formatTransferLeg,
  parseAmountDigits,
  recentDisplayAmount,
  visibleRecents,
} from '#/hooks/quick-add-form'

import type {
  Account,
  AdjustPolarity,
  ClaimAction,
  Debt,
  QuickAddInitial,
  QuickAddPayload,
  RecentTransaction,
  TxnType,
} from '#/lib/app-data'
import type {
  QuickAddCategory,
  QuickAddIncomeSource,
} from '#/hooks/quick-add-form'

export interface QuickAddFormOptions {
  initial: QuickAddInitial
  categories: readonly QuickAddCategory[]
  accounts: Account[]
  debts?: Debt[]
  incomeSources?: QuickAddIncomeSource[]
  recents?: RecentTransaction[]
  defaultExpenseAccountId: string
  defaultTransferFromAccountId: string
  defaultTransferToAccountId: string
  usdRate: number
  autoSaveRateForSource: (sourceId?: string) => number
  resolveAccountId: (accountId: string) => string
  /** Latest save error; opens the details section when it names a detail. */
  error?: string | null
  onSave: (payload: QuickAddPayload) => void
}

/**
 * Platform-neutral state for the quick-add sheet: form fields per transaction
 * type, amount entry and FX, derived validation and the save payload.
 */
export function useQuickAddForm({
  initial,
  categories,
  accounts,
  debts = [],
  incomeSources = [],
  recents = [],
  defaultExpenseAccountId,
  defaultTransferFromAccountId,
  defaultTransferToAccountId,
  usdRate,
  autoSaveRateForSource,
  resolveAccountId,
  error,
  onSave,
}: QuickAddFormOptions) {
  const isEditing = initial.transactionId !== undefined
  const defaultMwkAccountId =
    accounts.find(
      (account) =>
        account.id === defaultExpenseAccountId && account.currency === 'MWK',
    )?.id ??
    accounts.find((account) => account.currency === 'MWK')?.id ??
    ''
  const initialAccountId =
    initial.accountId ??
    (initial.mode === 'transfer'
      ? defaultTransferFromAccountId
      : initial.mode === 'claim'
        ? isEditing
          ? ''
          : defaultMwkAccountId
        : defaultExpenseAccountId)
  const initialAmountCurrency =
    initial.autoSave === true || initial.mode === 'claim'
      ? 'MWK'
      : (initial.amountCurrency ??
        accounts.find((account) => account.id === initialAccountId)?.currency ??
        'MWK')
  const initialUsdRate = initial.fxRate ?? usdRate
  const initialAmountIsNative =
    initial.amountCurrency !== undefined &&
    initial.autoSave !== true &&
    initial.mode !== 'claim'
  const [mode, setMode] = useState<TxnType>(initial.mode)
  const [digits, setDigits] = useState(() =>
    initial.amount
      ? amountToDigits(
          initialAmountIsNative
            ? initial.amount
            : initialAmountCurrency === 'USD'
              ? mwkToCurrency(initial.amount, 'USD', initialUsdRate)
              : initial.amount,
        )
      : '',
  )
  const [categoryId, setCategoryId] = useState(
    initial.categoryId ?? firstExpenseCategoryKey(categories),
  )
  const [accountId, setAccountId] = useState(initialAccountId)
  const [toAccountId, setToAccountId] = useState(
    initial.toAccountId ?? defaultTransferToAccountId,
  )
  const initialIncomeSourceId =
    initial.sourceId ||
    (!isEditing && initial.mode === 'income'
      ? defaultIncomeSourceId(incomeSources)
      : '')
  const archivedIncomeSourceId =
    initial.mode === 'income' &&
    initial.sourceId &&
    !incomeSources.some((source) => source.id === initial.sourceId)
      ? initial.sourceId
      : undefined
  const [sourceId, setSourceId] = useState(initialIncomeSourceId)
  const [payee, setPayee] = useState(() => {
    if (initial.payee) return initial.payee
    if (initial.mode !== 'income') return ''
    return (
      incomeSources.find((source) => source.id === initialIncomeSourceId)
        ?.name ?? ''
    )
  })
  const [items, setItems] = useState(initial.items ?? '')
  const [note, setNote] = useState(initial.note ?? '')
  const [excludeFromBudget, setExcludeFromBudget] = useState(
    initial.excludeFromBudget ?? false,
  )
  const [fromSavings, setFromSavings] = useState(initial.fromSavings ?? false)
  const [debtId, setDebtId] = useState(initial.debtId ?? '')
  const [claimAction, setClaimAction] = useState<ClaimAction>(
    initial.claimAction ??
      defaultClaimAction(
        debts.find((debt) => debt.id === initial.debtId)?.direction ??
          'you_owe',
      ),
  )
  const [adjustPolarity, setAdjustPolarity] = useState<AdjustPolarity>(
    initial.adjustPolarity ?? 'decrease',
  )
  const [occurredAt, setOccurredAt] = useState(initial.occurredAt ?? 0)
  const isAutoSave = initial.autoSave === true
  const fromAccount = accounts.find((account) => account.id === accountId)
  const toAccount = accounts.find((account) => account.id === toAccountId)
  const amountCurrency: Account['currency'] = isAutoSave
    ? 'MWK'
    : mode === 'claim'
      ? 'MWK'
      : (fromAccount?.currency ?? 'MWK')
  const conversionRate = initial.fxRate ?? usdRate
  const amount = parseAmountDigits(digits)
  let amountMwk = amount
  if (amount > 0 && amountCurrency === 'USD' && conversionRate > 0) {
    try {
      amountMwk = currencyToMwk(amount, 'USD', conversionRate)
    } catch {
      amountMwk = 0
    }
  }
  const autoSaveRate = autoSaveRateForSource(
    mode === 'income' ? sourceId || undefined : undefined,
  )
  const sheetRecents = visibleRecents(recents, categories)
  const selectedDebt = debts.find((debt) => debt.id === debtId)
  const pickerDebts = debts.filter(
    (debt) => !debt.archived || debt.id === (initial.debtId ?? debtId),
  )
  const activeDebts = debts.filter((debt) => !debt.archived)
  const mwkAccounts = accounts.filter((account) => account.currency === 'MWK')
  const claimNeedsAccount =
    mode === 'claim' && claimRequiresAccount(claimAction)
  const claimHidesAccount = mode === 'claim' && claimForbidsAccount(claimAction)
  const nextRemaining =
    mode === 'claim' && selectedDebt && amountMwk > 0
      ? remainingAfterReplacement(
          selectedDebt.remaining,
          {
            action: claimAction,
            amount: amountMwk,
            adjustPolarity:
              claimAction === 'adjust' ? adjustPolarity : undefined,
          },
          isEditing && initial.claimAction
            ? {
                action: initial.claimAction,
                amount: initial.amount ?? 0,
                adjustPolarity: initial.adjustPolarity,
              }
            : undefined,
        )
      : null
  const claimWouldGoNegative = nextRemaining !== null && nextRemaining < 0
  const canSave =
    amount > 0 &&
    amountMwk > 0 &&
    (amountCurrency !== 'USD' || conversionRate > 0) &&
    !claimWouldGoNegative &&
    (isAutoSave ||
      (mode === 'claim'
        ? Boolean(debtId) && (!claimNeedsAccount || Boolean(accountId))
        : Boolean(accountId) &&
          (mode !== 'transfer' || accountId !== toAccountId)))

  function retargetAmount(previousAccountId: string, nextAccountId: string) {
    const previous = accounts.find(
      (account) => account.id === previousAccountId,
    )
    const next = accounts.find((account) => account.id === nextAccountId)
    if (!previous || !next || previous.currency === next.currency) return
    setDigits((current) => {
      const parsed = parseAmountDigits(current)
      if (parsed <= 0 || conversionRate <= 0) return current
      try {
        const mwk = currencyToMwk(parsed, previous.currency, conversionRate)
        return amountToDigits(mwkToCurrency(mwk, next.currency, conversionRate))
      } catch {
        return current
      }
    })
  }

  /** Picks the source account, converting the entered amount if needed. */
  function selectAccount(nextAccountId: string) {
    retargetAmount(accountId, nextAccountId)
    setAccountId(nextAccountId)
  }

  /** Appends a digit or decimal separator ("." or ",") to the amount. */
  function appendDigit(value: string) {
    setDigits((current) => appendAmountInput(current, value))
  }

  function deleteDigit() {
    setDigits((current) => current.slice(0, -1))
  }

  function save() {
    if (!canSave) return
    if (isAutoSave) {
      onSave({
        transactionId: initial.transactionId,
        type: 'allocation',
        amount: amountMwk,
        payee: initial.payee ?? 'Auto-save',
        note: note.trim() || undefined,
        occurredAt,
      })
      return
    }
    onSave({
      transactionId: initial.transactionId,
      type: mode,
      amount: amountMwk,
      categoryId: mode !== 'expense' ? undefined : categoryId,
      accountId:
        mode === 'claim' && (claimHidesAccount || !accountId)
          ? undefined
          : accountId,
      toAccountId: mode !== 'transfer' ? undefined : toAccountId,
      payee:
        mode === 'claim'
          ? (selectedDebt?.name ?? (payee.trim() || 'Debt'))
          : mode === 'transfer'
            ? 'Transfer'
            : payee.trim() ||
              (mode === 'income'
                ? 'Income'
                : (findCategory(categories, categoryId)?.name ?? 'Expense')),
      sourceId: mode === 'income' ? sourceId || undefined : undefined,
      items: mode === 'expense' && items.trim() ? items.trim() : undefined,
      note: note.trim() || undefined,
      occurredAt,
      excludeFromBudget: mode === 'expense' && excludeFromBudget,
      reconcile: initial.reconcile,
      fromSavings:
        ((mode === 'expense' || mode === 'transfer') && fromSavings) ||
        (mode === 'claim' && fromSavings && claimAllowsFromSavings(claimAction))
          ? true
          : undefined,
      debtId: mode === 'claim' ? debtId : undefined,
      claimAction: mode === 'claim' ? claimAction : undefined,
      adjustPolarity:
        mode === 'claim' && claimAction === 'adjust'
          ? adjustPolarity
          : undefined,
    })
  }

  const amountDisplay = formatAmountDigitsDisplay(digits, amountCurrency)
  const saveLabel = isEditing
    ? 'Save changes'
    : mode === 'expense'
      ? `Log expense${amount ? ` — ${formatEnteredAmount(amount, amountCurrency)}` : ''}`
      : mode === 'income'
        ? `Log income${amount ? ` — ${formatEnteredAmount(amount, amountCurrency)}` : ''}`
        : mode === 'claim'
          ? `${claimActionLabel(claimAction, adjustPolarity)}${amount ? ` — ${formatEnteredAmount(amount, amountCurrency)}` : ''}`
          : `Move${amount ? ` ${formatEnteredAmount(amount, amountCurrency)}` : ''}`
  /** Both legs of a cross-currency transfer, or null when not applicable. */
  const transferLegs =
    mode === 'transfer' &&
    fromAccount &&
    toAccount &&
    fromAccount.currency !== toAccount.currency &&
    conversionRate > 0 &&
    amountMwk > 0
      ? {
          from: formatTransferLeg(fromAccount, amountMwk, conversionRate, '−'),
          to: formatTransferLeg(toAccount, amountMwk, conversionRate, '+'),
        }
      : null

  // Optional fields behind "More details", summarised while collapsed.
  const defaultPayee =
    mode === 'income'
      ? (incomeSources.find((source) => source.id === sourceId)?.name ??
        'Income')
      : findCategory(categories, categoryId)?.name
  const detailSummary = [
    (mode === 'expense' || mode === 'income') &&
      payee.trim() &&
      payee.trim().toLowerCase() !== defaultPayee?.toLowerCase() &&
      payee.trim(),
    mode === 'expense' && items.trim() && 'Items',
    (mode === 'expense' || mode === 'transfer') &&
      fromSavings &&
      'From savings',
    mode === 'expense' && !fromSavings && excludeFromBudget && 'Excluded',
    occurredAt !== 0 &&
      new Date(occurredAt).toDateString() !== new Date().toDateString() &&
      formatTransactionDate(occurredAt),
    note.trim() && 'Note',
  ].filter((part): part is string => typeof part === 'string')
  const [showDetails, setShowDetails] = useState(
    () => isEditing && detailSummary.length > 0,
  )
  const [detailsError, setDetailsError] = useState(error)
  if (error !== detailsError) {
    setDetailsError(error)
    if (error && /date|note|payee|item|saving|budget/i.test(error)) {
      setShowDetails(true)
    }
  }
  const detailsOpen = isAutoSave || showDetails

  function toggleDetails() {
    setShowDetails((current) => !current)
  }

  function toggleExcludeFromBudget() {
    setExcludeFromBudget((current) => !current)
  }

  function selectRecent(recent: RecentTransaction) {
    const nextAccountId = resolveAccountId(recent.accountId)
    const nextAccount = accounts.find((account) => account.id === nextAccountId)
    const display = recentDisplayAmount(recent, nextAccount, conversionRate)
    setDigits(amountToDigits(display.amount))
    setCategoryId(recent.categoryId)
    setAccountId(nextAccountId)
    setPayee(recent.payee)
  }

  function switchMode(nextMode: TxnType) {
    const nextAccountId =
      nextMode === 'transfer'
        ? defaultTransferFromAccountId
        : nextMode === 'claim'
          ? defaultMwkAccountId
          : mode === 'transfer' || mode === 'claim'
            ? defaultExpenseAccountId
            : accountId
    retargetAmount(accountId, nextAccountId)
    setMode(nextMode)
    if (nextMode === 'transfer') {
      setAccountId(defaultTransferFromAccountId)
      setToAccountId(defaultTransferToAccountId)
    } else if (mode === 'transfer' || nextMode === 'claim') {
      setAccountId(nextAccountId)
    }
    if (nextMode === 'claim' && !debtId && activeDebts[0]) {
      setDebtId(activeDebts[0].id)
      setClaimAction(defaultClaimAction(activeDebts[0].direction))
    }
    if (nextMode === 'income' && !sourceId && !isEditing) {
      setSourceId(defaultIncomeSourceId(incomeSources))
    }
  }

  /** Picks a debt; new entries also reset the action to its default. */
  function selectDebt(id: string) {
    setDebtId(id)
    const debt = debts.find((item) => item.id === id)
    if (debt && !isEditing) {
      setClaimAction(defaultClaimAction(debt.direction))
    }
  }

  /** Starts an unassigned income without keeping the previous source's name. */
  function clearIncomeSource() {
    setPayee('')
    setSourceId('')
  }

  /** Picks a source, replacing the payee if it was empty or the old source's. */
  function selectIncomeSource(source: QuickAddIncomeSource) {
    const previous = incomeSources.find((item) => item.id === sourceId)
    setSourceId(source.id)
    if (
      !payee.trim() ||
      payee.trim().toLowerCase() === previous?.name.toLowerCase()
    ) {
      setPayee(source.name)
    }
  }

  return {
    isEditing,
    isAutoSave,
    mode,
    switchMode,
    // Amount
    digits,
    amount,
    amountMwk,
    amountCurrency,
    amountDisplay,
    conversionRate,
    appendDigit,
    deleteDigit,
    transferLegs,
    // Accounts
    accountId,
    selectAccount,
    setAccountId,
    toAccountId,
    setToAccountId,
    mwkAccounts,
    // Expense
    categoryId,
    setCategoryId,
    sheetRecents,
    selectRecent,
    items,
    setItems,
    excludeFromBudget,
    toggleExcludeFromBudget,
    // Income
    sourceId,
    archivedIncomeSourceId,
    selectIncomeSource,
    clearIncomeSource,
    autoSaveRate,
    // Claim
    debtId,
    selectDebt,
    pickerDebts,
    claimAction,
    setClaimAction,
    adjustPolarity,
    setAdjustPolarity,
    nextRemaining,
    // Shared details
    payee,
    setPayee,
    note,
    setNote,
    fromSavings,
    setFromSavings,
    occurredAt,
    setOccurredAt,
    detailSummary,
    detailsOpen,
    toggleDetails,
    // Submit
    canSave,
    save,
    saveLabel,
  }
}

export type QuickAddForm = ReturnType<typeof useQuickAddForm>
