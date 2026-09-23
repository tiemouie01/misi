export type CheckpointDebtEntry = {
  debtId: string
  remaining: number
}

/**
 * A checkpoint summarizes movements strictly before its boundary; movements at
 * the boundary belong to the resumed fold. A read that excludes a movement the
 * checkpoint already summarizes cannot use that checkpoint.
 */
export function isBeforeCheckpoint(asOf: number, occurredAt: number) {
  return occurredAt < asOf
}

/** A debt created after a checkpoint starts from its own opening balance. */
export function checkpointDebtOpeningBalance(
  entries: readonly CheckpointDebtEntry[],
  debtId: string,
  openingBalance: number,
) {
  return (
    entries.find((entry) => entry.debtId === debtId)?.remaining ??
    openingBalance
  )
}

type MergingDebt<TDebtId extends string> = {
  debtId: TDebtId
  openingBalance: number
}

/**
 * Folds the source debt's checkpoint remaining into the target's so that, once
 * the target's opening balance becomes the sum of both, the target resumes from
 * the combined remaining. A missing entry stands for the debt's own opening
 * balance, exactly as checkpointDebtOpeningBalance reads it.
 */
export function mergeCheckpointDebtEntries<TDebtId extends string>(
  entries: ReadonlyArray<{ debtId: TDebtId; remaining: number }>,
  source: MergingDebt<TDebtId>,
  target: MergingDebt<TDebtId>,
) {
  const remaining =
    checkpointDebtOpeningBalance(
      entries,
      source.debtId,
      source.openingBalance,
    ) +
    checkpointDebtOpeningBalance(entries, target.debtId, target.openingBalance)
  return [
    ...entries.filter(
      (entry) =>
        entry.debtId !== source.debtId && entry.debtId !== target.debtId,
    ),
    { debtId: target.debtId, remaining: Math.round(remaining * 100) / 100 },
  ]
}
