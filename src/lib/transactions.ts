import type { Doc } from '../../convex/_generated/dataModel'
import type { QuickAddInitial, Txn } from '#/lib/app-data'

/** Reuse date formatters across transaction lists instead of constructing a
 * new Intl.DateTimeFormat for every rendered row. */
const dayLabelFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const dayLabelWithYearFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function sameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function transactionDayLabel(occurredAt: number, now: number) {
  const date = new Date(occurredAt)
  const today = new Date(now)
  if (sameCalendarDay(date, today)) return 'Today'

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (sameCalendarDay(date, yesterday)) return 'Yesterday'

  const format =
    date.getFullYear() === today.getFullYear()
      ? dayLabelFormat
      : dayLabelWithYearFormat
  return format.format(date).replace(',', '')
}

/** Maps a transaction document to the UI shape, labelled by day. */
export function toTxn(transaction: Doc<'transactions'>, now: number): Txn {
  return {
    id: transaction._id,
    type: transaction.type,
    amount: transaction.amount,
    fxRate: transaction.fxRate,
    payee: transaction.payee,
    categoryId: transaction.categoryId,
    accountId: transaction.accountId,
    toAccountId: transaction.toAccountId,
    direction: transaction.direction,
    walletId: transaction.walletId,
    sourceId: transaction.sourceId,
    items: transaction.items,
    note: transaction.note,
    excludeFromBudget: transaction.excludeFromBudget,
    occurredAt: transaction.occurredAt,
    day: transactionDayLabel(transaction.occurredAt, now),
    debtId: transaction.debtId,
    claimAction: transaction.claimAction,
    adjustPolarity: transaction.adjustPolarity,
    adjustment: transaction.adjustment ? true : undefined,
    autoSave: transaction.autoSave ? true : undefined,
  }
}

/** What the quick-add sheet opens with to edit an existing transaction. */
export function editInitialFromTxn(transaction: Txn): QuickAddInitial {
  return {
    transactionId: transaction.id,
    mode: transaction.type,
    amount: transaction.amount,
    fxRate: transaction.fxRate,
    categoryId: transaction.categoryId,
    accountId: transaction.accountId,
    toAccountId: transaction.toAccountId,
    payee: transaction.payee,
    sourceId: transaction.sourceId,
    items: transaction.items,
    note: transaction.note,
    occurredAt: transaction.occurredAt,
    excludeFromBudget: transaction.excludeFromBudget,
    autoSave: transaction.autoSave,
    fromSavings:
      transaction.walletId === 'savings' && transaction.type !== 'allocation',
    debtId: transaction.debtId,
    claimAction: transaction.claimAction,
    adjustPolarity: transaction.adjustPolarity,
  }
}
