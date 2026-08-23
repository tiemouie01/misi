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
