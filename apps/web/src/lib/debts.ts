import type { Debt } from '#/lib/app-data'

export function mapDebt(debt: {
  _id: string
  name: string
  direction: Debt['direction']
  openingBalance: number
  remaining: number
  archivedAt?: number
}): Debt {
  return {
    id: debt._id,
    name: debt.name,
    direction: debt.direction,
    openingBalance: debt.openingBalance,
    remaining: debt.remaining,
    archived: debt.archivedAt !== undefined,
  }
}
