import { Check } from 'lucide-react'
import { useState } from 'react'

import { formatK } from '#/lib/app-data'

import type { Account, QuickAddInitial, ReconcileBalance } from '#/lib/app-data'

interface ReconcileCardProps {
  accounts: Account[]
  balances: ReconcileBalance[]
  closed: boolean
  onActualChange: (accountId: string, actual: number) => void
  onAbsorb: (accountId: string) => void
  onLogMissing: (initial: QuickAddInitial) => void
  animationDelay: string
}

function DriftChip({ drift }: { drift: number }) {
  if (drift === 0) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-palm/12 px-2.5 py-1 text-[0.72rem] font-bold text-palm">
        <Check className="size-3" strokeWidth={3} />
        Matched
      </span>
    )
  }
  return (
    <span className="font-mono rounded-full bg-[#d96a4e]/12 px-2.5 py-1 text-[0.72rem] font-semibold text-[#c05a40] tabular-nums">
      {formatK(drift)}
    </span>
  )
}

export function ReconcileCard({
  accounts,
  balances,
  closed,
  onActualChange,
  onAbsorb,
  onLogMissing,
  animationDelay,
}: ReconcileCardProps) {
  const [expanded, setExpanded] = useState(false)
  const visibleBalances = balances.filter((balance) =>
    ['nbm', 'fdh', 'airtel', 'cash'].includes(balance.accountId),
  )
  const gaps = visibleBalances.filter(
    (balance) => balance.actual !== balance.expected,
  )
  const firstGap = gaps[0]
  const gapTotal = gaps.reduce(
    (sum, balance) => sum + Math.abs(balance.actual - balance.expected),
    0,
  )

  return (
    <section
      className="island-shell rise-in rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="island-kicker">Reconcile</p>
        <span className="text-[0.72rem] font-semibold text-sea-ink-soft">
          {closed ? 'closed just now' : 'last closed 26 Jul'}
        </span>
      </div>
      <p className="font-display mt-2 text-xl font-bold text-sea-ink">
        Does Misi agree with reality?
      </p>
      <p className="mt-1 text-sm text-sea-ink-soft">
        Check each real balance. Any gap becomes a guided fix, not a spreadsheet
        chore.
      </p>
      {closed ? (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-palm/10 px-4 py-3.5">
          <span className="grid size-6 place-items-center rounded-full bg-palm/15 text-palm">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <p className="text-sm font-bold text-sea-ink">
            All matched — books agree with reality.
          </p>
        </div>
      ) : expanded ? (
        <>
          <div className="mt-4 space-y-2">
            {visibleBalances.map((balance) => {
              const account = accounts.find(
                (item) => item.id === balance.accountId,
              )
              const drift = balance.actual - balance.expected
              return (
                <div
                  key={balance.accountId}
                  className="rounded-xl border border-(--line) bg-(--chip-bg) px-3.5 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-sea-ink">
                      {account?.name}
                    </span>
                    <DriftChip drift={drift} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[0.75rem] text-sea-ink-soft tabular-nums">
                      Expected {formatK(balance.expected)}
                    </span>
                    <input
                      type="number"
                      aria-label={`${account?.name} actual balance`}
                      className="font-mono w-28 rounded-lg border border-(--line) bg-(--chip-bg) px-2.5 py-1.5 text-right text-sm text-sea-ink tabular-nums focus:border-lagoon-deep focus:outline-none"
                      value={balance.actual}
                      onChange={(event) =>
                        onActualChange(
                          balance.accountId,
                          Number(event.target.value),
                        )
                      }
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {gaps.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#d96a4e]/8 px-4 py-3.5">
              <p className="text-sm font-bold text-sea-ink">
                {gaps.length} {gaps.length === 1 ? 'gap' : 'gaps'} —{' '}
                <span className="font-mono tabular-nums">
                  {formatK(gapTotal)}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-(--chip-line) bg-(--chip-bg) px-4 py-2 text-sm font-bold text-sea-ink transition hover:border-lagoon-deep"
                  onClick={() =>
                    onLogMissing({
                      mode: 'expense',
                      amount: Math.abs(firstGap.actual - firstGap.expected),
                      accountId: firstGap.accountId,
                      categoryId: 'groceries',
                      reconcile: true,
                    })
                  }
                >
                  Log missing expense
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[#d96a4e] px-4 py-2 text-sm font-bold text-white shadow-sm hover:brightness-110"
                  onClick={() => onAbsorb(firstGap.accountId)}
                >
                  Absorb as adjustment
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            className="mt-3 text-sm font-bold text-sea-ink-soft hover:text-sea-ink"
            onClick={() => setExpanded(false)}
          >
            Close
          </button>
        </>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {visibleBalances.map((balance) => {
              const account = accounts.find(
                (item) => item.id === balance.accountId,
              )
              const drift = balance.actual - balance.expected
              return (
                <div
                  key={balance.accountId}
                  className="flex items-center gap-3 rounded-xl border border-(--line) bg-(--chip-bg) px-4 py-3"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      background: drift ? '#d96a4e' : 'var(--palm)',
                    }}
                  />
                  <span className="w-24 shrink-0 text-sm font-bold text-sea-ink">
                    {account?.name}
                  </span>
                  <span className="font-mono flex-1 text-right text-[0.8rem] text-sea-ink-soft tabular-nums">
                    {formatK(balance.expected)}
                  </span>
                  <DriftChip drift={drift} />
                </div>
              )
            })}
          </div>
          <button
            type="button"
            className="btn-primary mt-4 w-full rounded-full py-3 text-sm font-bold shadow-md"
            onClick={() => setExpanded(true)}
          >
            Reconcile now
          </button>
        </>
      )}
    </section>
  )
}
