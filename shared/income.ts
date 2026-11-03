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

export interface IncomePlanRef {
  sourceId: string
  expectedAmount: number
  /** Set when the user ticked the line off as arrived without linking income. */
  markedArrivedAt?: number
}

/**
 * What a plan line counts as arrived: the income linked to it, raised to the
 * full expected amount once it is ticked off by hand. Linked income above the
 * plan still counts, and a tick never adds on top of what already landed.
 */
export function arrivedAmountForPlan(
  transactions: readonly IncomeTransactionRef[],
  plan: IncomePlanRef,
) {
  return arrivedAmount(landedAmountForSource(transactions, plan.sourceId), plan)
}

function arrivedAmount(landedAmount: number, plan: IncomePlanRef) {
  if (plan.markedArrivedAt === undefined) return landedAmount
  return Math.max(landedAmount, plan.expectedAmount)
}

export function incomeSourceStatus(
  landedAmount: number,
  expectedAmount: number,
  markedArrived = false,
): 'landed' | 'partial' | 'pending' {
  if (markedArrived) return 'landed'
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
 * A line ticked off by hand counts as arrived in full, topping actual income
 * up by whatever its linked income has not covered yet.
 *
 * `investmentIncome` is the unplanned part that went into accounts outside
 * free to spend (investment returns): it is income, but not spendable yet.
 */
export function summarizeCycleIncome(input: {
  transactions: readonly CycleIncomeTransaction[]
  plans: readonly IncomePlanRef[]
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
  const landedBySource = new Map<string, number>()
  for (const transaction of input.transactions) {
    if (transaction.type !== 'income' || transaction.adjustment) continue
    actualIncome += transaction.amount
    if (transaction.sourceId && plannedSourceIds.has(transaction.sourceId)) {
      landedBySource.set(
        transaction.sourceId,
        (landedBySource.get(transaction.sourceId) ?? 0) + transaction.amount,
      )
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
  for (const plan of input.plans) {
    const landed = landedBySource.get(plan.sourceId) ?? 0
    actualIncome += arrivedAmount(landed, plan) - landed
  }
  return {
    plannedIncome,
    actualIncome,
    unassignedIncome,
    investmentIncome,
    expectedIncome: plannedIncome + unassignedIncome,
  }
}
