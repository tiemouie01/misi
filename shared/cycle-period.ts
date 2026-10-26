/**
 * Pure budget-cycle period math, shared by Convex and the client. Cycles run
 * from payday to the day before the next payday in Blantyre time (UTC+2, no
 * daylight saving), so every boundary is a whole number of days apart.
 */
export const DEFAULT_PAYDAY_DAY = 20
/** A cycle bridging a payday change is never shorter than this. */
export const MIN_TRANSITION_CYCLE_DAYS = 14

const BLANTYRE_UTC_OFFSET_MS = 2 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

const monthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export type CyclePeriod = { label: string; startsAt: number; endsAt: number }

function labelFor(startsAt: number) {
  const startDate = new Date(startsAt + BLANTYRE_UTC_OFFSET_MS)
  return `${monthLabels[startDate.getUTCMonth()]} cycle`
}

/** The payday-aligned period containing `now`. */
export function getCyclePeriod(
  now: number,
  paydayDay = DEFAULT_PAYDAY_DAY,
): CyclePeriod {
  const today = new Date(now + BLANTYRE_UTC_OFFSET_MS)
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()
  const startMonth = today.getUTCDate() >= paydayDay ? month : month - 1
  const startsAt =
    Date.UTC(year, startMonth, paydayDay) - BLANTYRE_UTC_OFFSET_MS
  const endsAt =
    Date.UTC(year, startMonth + 1, paydayDay) - BLANTYRE_UTC_OFFSET_MS - 1

  return { label: labelFor(startsAt), startsAt, endsAt }
}

/**
 * The period a new cycle containing `date` should cover, given the cycle
 * before it. Normally that is the payday-aligned period. When the payday has
 * changed and that period would overlap `previous`, the new cycle starts the
 * day after `previous` ends instead, and if that leaves fewer than
 * MIN_TRANSITION_CYCLE_DAYS it runs on to the following payday boundary. A gap
 * after `previous` is left as it is. `date` is expected to fall after
 * `previous.endsAt`.
 */
export function resolveCyclePeriod(
  date: number,
  paydayDay: number,
  previous: { startsAt: number; endsAt: number } | null,
): CyclePeriod {
  const period = getCyclePeriod(date, paydayDay)
  if (!previous || period.startsAt > previous.endsAt) return period

  const startsAt = previous.endsAt + 1
  const days = (period.endsAt + 1 - startsAt) / DAY_MS
  const endsAt =
    days < MIN_TRANSITION_CYCLE_DAYS
      ? getCyclePeriod(period.endsAt + 1, paydayDay).endsAt
      : period.endsAt

  return { label: labelFor(startsAt), startsAt, endsAt }
}
