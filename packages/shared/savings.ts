export type SavingsMovementType =
  'expense' | 'income' | 'transfer' | 'allocation' | 'claim'

export interface SavingsMovement {
  id?: string
  type: SavingsMovementType
  direction?: 'toSavings' | 'toSpending'
  amount: number
}

export function savingsEnvelopeContribution(movement: SavingsMovement) {
  if (movement.type === 'allocation') {
    if (movement.direction === 'toSavings') return movement.amount
    if (movement.direction === 'toSpending') return -movement.amount
    return 0
  }
  if (
    movement.type === 'transfer' ||
    movement.type === 'expense' ||
    movement.type === 'claim'
  ) {
    return -movement.amount
  }
  return 0
}

/**
 * Fold savings-envelope movements from an opening balance. Callers can pass
 * only movements at or after a checkpoint boundary to resume a staged fold.
 */
export function foldSavingsBalance(
  openingBalance: number,
  movements: readonly SavingsMovement[],
  excludeId?: string,
) {
  return movements.reduce((balance, movement) => {
    if (movement.id !== undefined && movement.id === excludeId) return balance
    return balance + savingsEnvelopeContribution(movement)
  }, openingBalance)
}

/** Spendable cash minus the savings earmark. May be negative. */
export function spendingEnvelopeBalance(spendable: number, savings: number) {
  return spendable - savings
}

export function canConfirmEnvelopeMove(
  amount: number,
  direction: 'toSavings' | 'toSpending',
  savingsBalance: number,
) {
  if (!Number.isFinite(amount) || amount <= 0) return false
  if (direction === 'toSpending' && amount > savingsBalance) return false
  return true
}
