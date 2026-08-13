/**
 * Cycle period math ported from convex/misi.ts.
 */

export const monthLabels = [
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

export const DEFAULT_PAYDAY_DAY = 20
export const BLANTYRE_UTC_OFFSET_MS = 2 * 60 * 60 * 1000

/**
 * Ports `getCyclePeriod` from convex/misi.ts.
 */
export function getCyclePeriod(now: number, paydayDay = DEFAULT_PAYDAY_DAY) {
  const today = new Date(now + BLANTYRE_UTC_OFFSET_MS)
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()
  const day = today.getUTCDate()
  const startMonth = day >= paydayDay ? month : month - 1
  const startsAt =
    Date.UTC(year, startMonth, paydayDay) - BLANTYRE_UTC_OFFSET_MS
  const endsAt =
    Date.UTC(year, startMonth + 1, paydayDay) - BLANTYRE_UTC_OFFSET_MS - 1
  const startDate = new Date(startsAt + BLANTYRE_UTC_OFFSET_MS)

  return {
    label: `${monthLabels[startDate.getUTCMonth()]} cycle`,
    startsAt,
    endsAt,
  }
}
