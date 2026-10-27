const kwachaFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

const compactFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumSignificantDigits: 3,
})

/** Amounts below this stay exact in compact form. */
const COMPACT_FROM = 100_000

export function formatK(value: number) {
  const absolute = kwachaFormat.format(Math.abs(value))
  return `${value < 0 ? '-' : ''}K${absolute}`
}

/** Short form for tight spaces: K12,500, K950K, K3.04M. */
export function formatKCompact(value: number) {
  if (Math.abs(value) < COMPACT_FROM) return formatK(value)
  const absolute = compactFormat.format(Math.abs(value))
  return `${value < 0 ? '-' : ''}K${absolute}`
}
