export interface IncomeTransactionRef {
  type: string
  amount: number
  sourceId?: string
  adjustment?: boolean
}

/** Only an explicit source link lands income; payee text never matches. */
export function landedAmountForSource(
  transactions: readonly IncomeTransactionRef[],
  sourceId: string,
) {
  return transactions.reduce((sum, transaction) => {
    if (transaction.type !== 'income' || transaction.adjustment) return sum
    if (transaction.sourceId !== sourceId) return sum
    return sum + transaction.amount
  }, 0)
}

export function totalActualIncome(
  transactions: readonly Pick<
    IncomeTransactionRef,
    'type' | 'amount' | 'adjustment'
  >[],
) {
  return transactions.reduce((sum, transaction) => {
    if (transaction.type !== 'income' || transaction.adjustment) return sum
    return sum + transaction.amount
  }, 0)
}

export function incomeSourceStatus(
  landedAmount: number,
  expectedAmount: number,
): 'landed' | 'partial' | 'pending' {
  if (landedAmount >= expectedAmount && expectedAmount > 0) return 'landed'
  if (landedAmount > 0) return 'partial'
  return 'pending'
}
