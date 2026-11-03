/**
 * How a cycle's money was used across needs, wants and savings, as shares
 * that add up to 100, so the plan's split and what actually happened can sit
 * side by side.
 */
export type SplitKey = 'needs' | 'wants' | 'savings' | 'other'

export type SplitPart = { key: SplitKey; amount: number; percent: number }

export type Split = { total: number; parts: SplitPart[] }

const ORDER: readonly SplitKey[] = ['needs', 'wants', 'savings', 'other']

/** Whole-number percents that always total exactly 100 (largest remainder). */
function wholePercents(amounts: readonly number[], total: number) {
  if (total <= 0) return amounts.map(() => 0)
  const raw = amounts.map((amount) => (amount / total) * 100)
  const floors = raw.map(Math.floor)
  let left = 100 - floors.reduce((sum, value) => sum + value, 0)
  const byRemainder = raw
    .map((value, index) => ({ index, remainder: value - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder)
  for (const { index } of byRemainder) {
    if (left <= 0) break
    floors[index] += 1
    left -= 1
  }
  return floors
}

/** Negative amounts (e.g. more moved out of savings than in) count as none. */
export function splitOf(amounts: Partial<Record<SplitKey, number>>): Split {
  const keys = ORDER.filter((key) => key in amounts)
  const values = keys.map((key) => Math.max(0, amounts[key] ?? 0))
  const total = values.reduce((sum, value) => sum + value, 0)
  const percents = wholePercents(values, total)
  return {
    total,
    parts: keys.map((key, index) => ({
      key,
      amount: values[index],
      percent: percents[index],
    })),
  }
}

/**
 * What was actually used: spending by category group, plus the net moved to
 * savings. Spending outside the listed categories (uncategorized, or in an
 * archived category) shows as "other" so the parts still add up to the total.
 */
export function actualSplit({
  categories,
  actualSpending,
  actualSavings,
}: {
  categories: ReadonlyArray<{ group: 'needs' | 'wants'; spent: number }>
  actualSpending: number
  actualSavings: number
}): Split {
  let needs = 0
  let wants = 0
  for (const category of categories) {
    const spent = Math.max(0, category.spent)
    if (category.group === 'needs') needs += spent
    else wants += spent
  }
  const other = actualSpending - needs - wants
  return splitOf({
    needs,
    wants,
    savings: actualSavings,
    // Ignore rounding dust so a stray ngwee never adds a segment.
    ...(other >= 1 ? { other } : {}),
  })
}
