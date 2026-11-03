/**
 * Day-by-day spending within a budget cycle, for the home page's charts. Days
 * count whole `DAY_MS` steps from the cycle start, the same way the home page
 * counts "day N of the cycle", so the charts and the numbers always agree.
 */
const DAY_MS = 86_400_000

/** Too few days to project from: one big early bill would dominate. */
const MIN_PROJECTION_DAYS = 3

export type CycleSpendInput = {
  startsAt: number
  /** Last millisecond of the cycle; payday is `endsAt + 1`. */
  endsAt: number
  now: number
  expenses: ReadonlyArray<{ amount: number; occurredAt: number }>
}

export type CycleSpend = {
  startsAt: number
  totalDays: number
  /** Zero-based index of today within the cycle. */
  today: number
  /** Spend on each day from the first through today. */
  daily: number[]
  /** Running total at the end of each day from the first through today. */
  cumulative: number[]
  /** Where the total lands on payday if the average so far holds; null while
      there are too few days to say. */
  projected: number | null
}

export function cycleSpend({
  startsAt,
  endsAt,
  now,
  expenses,
}: CycleSpendInput): CycleSpend {
  const totalDays = Math.max(1, Math.ceil((endsAt + 1 - startsAt) / DAY_MS))
  const dayOf = (time: number) =>
    Math.min(totalDays - 1, Math.max(0, Math.floor((time - startsAt) / DAY_MS)))
  const today = dayOf(now)

  // Anything dated after today still counts today, so the last running total
  // matches the "spent" figure beside the chart.
  const daily = Array.from({ length: today + 1 }, () => 0)
  for (const expense of expenses) {
    daily[Math.min(today, dayOf(expense.occurredAt))] += expense.amount
  }

  let running = 0
  const cumulative = daily.map((amount) => (running += amount))
  const daysElapsed = today + 1
  const projected =
    daysElapsed >= MIN_PROJECTION_DAYS && daysElapsed < totalDays
      ? (running / daysElapsed) * totalDays
      : null

  return { startsAt, totalDays, today, daily, cumulative, projected }
}

/** The last `count` days through today, oldest first; days before the cycle
    began are null so the strip keeps a steady width. */
export function recentDays(daily: readonly number[], count: number) {
  return Array.from({ length: count }, (_, index) => {
    const day = daily.length - count + index
    return day >= 0 ? daily[day] : null
  })
}
