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

export interface CycleIncomeTransaction extends IncomeTransactionRef {
  accountId?: string
}

/**
 * The cycle's income picture. Expected income is every planned line (recurring
 * paydays and one-offs) plus whatever arrived without landing on one of them,
 * so it never trails what actually came in. Income that lands on a line is
 * already inside that line's plan, so it is never counted twice.
 *
 * `investmentIncome` is the unplanned part that went into accounts outside
 * free to spend (investment returns): it is income, but not spendable yet.
 */
export function summarizeCycleIncome(input: {
  transactions: readonly CycleIncomeTransaction[]
  plans: readonly { sourceId: string; expectedAmount: number }[]
  nonSpendableAccountIds: ReadonlySet<string>
}) {
  const plannedSourceIds = new Set(input.plans.map((plan) => plan.sourceId))
  const plannedIncome = input.plans.reduce(
    (sum, plan) => sum + plan.expectedAmount,
    0,
  )
  let actualIncome = 0
  let unassignedIncome = 0
  let investmentIncome = 0
  for (const transaction of input.transactions) {
    if (transaction.type !== 'income' || transaction.adjustment) continue
    actualIncome += transaction.amount
    if (transaction.sourceId && plannedSourceIds.has(transaction.sourceId)) {
      continue
    }
    unassignedIncome += transaction.amount
    if (
      transaction.accountId &&
      input.nonSpendableAccountIds.has(transaction.accountId)
    ) {
      investmentIncome += transaction.amount
    }
  }
  return {
    plannedIncome,
    actualIncome,
    unassignedIncome,
    investmentIncome,
    expectedIncome: plannedIncome + unassignedIncome,
  }
}
