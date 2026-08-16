export const DEBT_DIRECTIONS = ['you_owe', 'owed_to_you'] as const
export const CLAIM_ACTIONS = [
  'borrow',
  'lend',
  'repay',
  'collect',
  'adjust',
] as const
export const ADJUST_POLARITIES = ['increase', 'decrease'] as const

export type DebtDirection = (typeof DEBT_DIRECTIONS)[number]
export type ClaimAction = (typeof CLAIM_ACTIONS)[number]
export type AdjustPolarity = (typeof ADJUST_POLARITIES)[number]

export interface ClaimMovement {
  id?: string
  action: ClaimAction
  amount: number
  adjustPolarity?: AdjustPolarity
}

export function debtOpeningBalance(debt: {
  openingBalance?: number
  balance?: number
}) {
  return debt.openingBalance ?? debt.balance ?? 0
}

export function debtDirection(debt: { direction?: DebtDirection }) {
  return debt.direction ?? 'you_owe'
}

export function defaultClaimAction(
  direction: DebtDirection,
): Extract<ClaimAction, 'repay' | 'collect'> {
  return direction === 'you_owe' ? 'repay' : 'collect'
}

export function claimActionMatchesDirection(
  action: ClaimAction,
  direction: DebtDirection,
) {
  if (action === 'adjust') return true
  if (direction === 'you_owe') return action === 'borrow' || action === 'repay'
  return action === 'lend' || action === 'collect'
}

export function claimCashKind(action: ClaimAction): 'in' | 'out' | null {
  if (action === 'borrow' || action === 'collect') return 'in'
  if (action === 'lend' || action === 'repay') return 'out'
  return null
}

export function claimRequiresAccount(action: ClaimAction) {
  return action === 'repay' || action === 'collect'
}

export function claimForbidsAccount(action: ClaimAction) {
  return action === 'adjust'
}

export function claimAllowsFromSavings(action: ClaimAction) {
  return action === 'repay' || action === 'lend'
}

export function claimRemainingDelta(movement: ClaimMovement) {
  if (movement.action === 'borrow' || movement.action === 'lend') {
    return movement.amount
  }
  if (movement.action === 'repay' || movement.action === 'collect') {
    return -movement.amount
  }
  return movement.adjustPolarity === 'decrease'
    ? -movement.amount
    : movement.amount
}

export function computeClaimRemaining(
  openingBalance: number,
  movements: readonly ClaimMovement[],
  excludeId?: string,
) {
  return movements.reduce((sum, movement) => {
    if (excludeId !== undefined && movement.id === excludeId) return sum
    return Math.round((sum + claimRemainingDelta(movement)) * 100) / 100
  }, openingBalance)
}

export function claimActionLabel(
  action: ClaimAction,
  polarity?: AdjustPolarity,
) {
  if (action === 'adjust') {
    return polarity === 'decrease' ? 'Adjust down' : 'Adjust up'
  }
  if (action === 'borrow') return 'Borrow'
  if (action === 'lend') return 'Lend'
  if (action === 'repay') return 'Repay'
  return 'Collect'
}

export function claimFeedTitle(
  action: ClaimAction,
  debtName: string,
  polarity?: AdjustPolarity,
) {
  if (action === 'adjust') {
    return polarity === 'decrease'
      ? `Adjust down · ${debtName}`
      : `Adjust up · ${debtName}`
  }
  return `${claimActionLabel(action)} · ${debtName}`
}

export function sortDebtsByRemaining<
  T extends { remaining: number; name: string },
>(debts: T[]) {
  return [...debts].sort((left, right) => {
    if (right.remaining !== left.remaining) {
      return right.remaining - left.remaining
    }
    return left.name.localeCompare(right.name, 'en', { sensitivity: 'base' })
  })
}
