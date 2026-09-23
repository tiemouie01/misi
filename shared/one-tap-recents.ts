export const ONE_TAP_RECENTS_LIMIT = 3
export const ONE_TAP_RECENTS_WINDOW_MS = 90 * 86_400_000

export type OneTapRecentLog = {
  type: string
  amount: number
  payee: string
  categoryId?: string
  accountId?: string
  occurredAt: number
  adjustment?: boolean
  autoSave?: boolean
}

export type OneTapRecent = {
  payee: string
  amount: number
  categoryId: string
  accountId: string
}

type AmountBucket = {
  amount: number
  count: number
  lastOccurredAt: number
  accountId: string
}

type RecentGroup = {
  payee: string
  categoryId: string
  count: number
  lastOccurredAt: number
  amounts: Map<number, AmountBucket>
}

export function oneTapRecentKey(
  recent: Pick<OneTapRecent, 'payee' | 'amount' | 'categoryId'>,
) {
  return `${normalizePayee(recent.payee)}\0${recent.amount}\0${recent.categoryId}`
}

export function oneTapRecentsFromLogs(
  logs: readonly OneTapRecentLog[],
  options?: {
    limit?: number
    sinceOccurredAt?: number
  },
): OneTapRecent[] {
  const limit = options?.limit ?? ONE_TAP_RECENTS_LIMIT
  if (limit <= 0) return []

  const groups = new Map<string, RecentGroup>()

  for (const log of logs) {
    if (!isEligibleRecentLog(log, options?.sinceOccurredAt)) continue

    const payee = collapseWhitespace(log.payee)
    const categoryId = log.categoryId?.trim() ?? ''
    const accountId = log.accountId
    if (!accountId) continue

    const key = `${normalizePayee(payee)}\0${categoryId}`
    const existing = groups.get(key)
    if (!existing) {
      groups.set(key, {
        payee,
        categoryId,
        count: 1,
        lastOccurredAt: log.occurredAt,
        amounts: new Map([
          [
            log.amount,
            {
              amount: log.amount,
              count: 1,
              lastOccurredAt: log.occurredAt,
              accountId,
            },
          ],
        ]),
      })
      continue
    }

    existing.count += 1
    if (log.occurredAt >= existing.lastOccurredAt) {
      existing.lastOccurredAt = log.occurredAt
      existing.payee = payee
    }

    const amountBucket = existing.amounts.get(log.amount)
    if (!amountBucket) {
      existing.amounts.set(log.amount, {
        amount: log.amount,
        count: 1,
        lastOccurredAt: log.occurredAt,
        accountId,
      })
      continue
    }

    amountBucket.count += 1
    if (log.occurredAt >= amountBucket.lastOccurredAt) {
      amountBucket.lastOccurredAt = log.occurredAt
      amountBucket.accountId = accountId
    }
  }

  return [...groups.values()]
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count
      return right.lastOccurredAt - left.lastOccurredAt
    })
    .slice(0, limit)
    .flatMap((group) => {
      const usual = [...group.amounts.values()].sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count
        return right.lastOccurredAt - left.lastOccurredAt
      })[0]

      return [
        {
          payee: group.payee,
          amount: usual.amount,
          categoryId: group.categoryId,
          accountId: usual.accountId,
        },
      ]
    })
}

/** Category keys ranked by how often expenses used them, then by recency. */
export function categoryUsageFromLogs(
  logs: readonly OneTapRecentLog[],
): string[] {
  const usage = new Map<string, { count: number; lastOccurredAt: number }>()
  for (const log of logs) {
    const categoryId = log.categoryId?.trim()
    if (log.type !== 'expense' || log.adjustment || log.autoSave) continue
    if (!categoryId) continue
    const existing = usage.get(categoryId)
    usage.set(categoryId, {
      count: (existing?.count ?? 0) + 1,
      lastOccurredAt: Math.max(existing?.lastOccurredAt ?? 0, log.occurredAt),
    })
  }
  return [...usage.entries()]
    .sort(
      ([, left], [, right]) =>
        right.count - left.count || right.lastOccurredAt - left.lastOccurredAt,
    )
    .map(([categoryId]) => categoryId)
}

function isEligibleRecentLog(log: OneTapRecentLog, sinceOccurredAt?: number) {
  if (log.type !== 'expense') return false
  if (log.adjustment || log.autoSave) return false
  if (!Number.isFinite(log.amount) || log.amount <= 0) return false
  if (!collapseWhitespace(log.payee)) return false
  if (!log.categoryId?.trim()) return false
  if (!log.accountId) return false
  if (sinceOccurredAt !== undefined && log.occurredAt < sinceOccurredAt) {
    return false
  }
  return true
}

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizePayee(payee: string) {
  return collapseWhitespace(payee).toLowerCase()
}
