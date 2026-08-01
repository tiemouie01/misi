import { Check } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { formatK, isSpendableAccount } from '#/lib/app-data'

import type { Account, QuickAddInitial, ReconcileBalance } from '#/lib/app-data'

interface ReconcileCardProps {
  accounts: Account[]
  balances: ReconcileBalance[]
  closed: boolean
  lastClosed: string
  onActualChange: (accountId: string, actual: number) => void
  onAbsorb: (accountId: string) => void
  onLogMissing: (initial: QuickAddInitial) => void
  animationDelay: string
}

function DriftChip({ drift }: { drift: number }) {
  if (drift === 0) {
    return (
      <Badge variant="success">
        <Check className="size-3" strokeWidth={3} />
        Matched
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="font-mono tabular-nums">
      {formatK(drift)}
    </Badge>
  )
}

export function ReconcileCard({
  accounts,
  balances,
  closed,
  lastClosed,
  onActualChange,
  onAbsorb,
  onLogMissing,
  animationDelay,
}: ReconcileCardProps) {
  const [expanded, setExpanded] = useState(false)
  const visibleBalances = balances.filter((balance) => {
    const account = accounts.find((item) => item.id === balance.accountId)
    return account ? isSpendableAccount(account) : false
  })
  const gaps = visibleBalances.filter(
    (balance) => balance.actual !== balance.expected,
  )
  const gapTotal = gaps.reduce(
    (sum, balance) => sum + Math.abs(balance.actual - balance.expected),
    0,
  )

  return (
    <Card
      variant="island"
      className="rise-in gap-0 rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="island-kicker">Reconcile</p>
        <span className="text-[0.72rem] font-semibold text-sea-ink-soft">
          {closed ? 'closed just now' : lastClosed}
        </span>
      </div>
      <p className="font-display mt-2 text-xl font-bold text-sea-ink">
        Does Misi agree with reality?
      </p>
      <p className="mt-1 text-sm text-sea-ink-soft">
        Check each real balance. Any gap becomes a guided fix, not a spreadsheet
        chore.
      </p>
      {closed && !expanded ? (
        <>
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-palm/10 px-4 py-3.5">
            <span className="grid size-6 place-items-center rounded-full bg-palm/15 text-palm">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <p className="text-sm font-bold text-sea-ink">
              All matched — books agree with reality.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => setExpanded(true)}
          >
            Check balances again
          </Button>
        </>
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
                    <Input
                      type="number"
                      aria-label={`${account?.name} actual balance`}
                      className="font-mono h-9 w-28 rounded-lg px-2.5 py-1.5 text-right tabular-nums"
                      value={balance.actual}
                      onChange={(event) =>
                        onActualChange(
                          balance.accountId,
                          Number(event.target.value),
                        )
                      }
                    />
                  </div>
                  {drift !== 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-(--line) pt-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          onLogMissing({
                            mode: 'expense',
                            amount: Math.abs(drift),
                            accountId: balance.accountId,
                            categoryId: 'groceries',
                            reconcile: true,
                          })
                        }
                      >
                        Log missing expense
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => onAbsorb(balance.accountId)}
                      >
                        Absorb as adjustment
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {gaps.length > 0 && (
            <div className="mt-4 rounded-xl bg-coral/8 px-4 py-3.5">
              <p className="text-sm font-bold text-sea-ink">
                {gaps.length} {gaps.length === 1 ? 'gap' : 'gaps'} —{' '}
                <span className="font-mono tabular-nums">
                  {formatK(gapTotal)}
                </span>{' '}
                total. Fix each account above.
              </p>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            className="mt-3"
            onClick={() => setExpanded(false)}
          >
            Close
          </Button>
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
                      background: drift ? 'var(--coral)' : 'var(--palm)',
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
          <Button
            type="button"
            className="mt-4 w-full"
            onClick={() => setExpanded(true)}
          >
            Reconcile now
          </Button>
        </>
      )}
    </Card>
  )
}
