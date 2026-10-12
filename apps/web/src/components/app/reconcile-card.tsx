import { Check } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { DialogFooter } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import {
  currencyToMwk,
  formatK,
  formatUsd,
  isSpendableAccount,
} from '#/lib/app-data'
import { firstExpenseCategoryKey } from '#/lib/categories'
import { cn } from '#/lib/utils'

import type { Account, QuickAddInitial, ReconcileBalance } from '#/lib/app-data'
import type { Category } from '#/lib/categories'
import type { ReactNode } from 'react'

interface ReconcileCardProps {
  accounts: Account[]
  categories: Category[]
  balances: ReconcileBalance[]
  closed: boolean
  lastClosed: string
  onActualChange: (accountId: string, actual: number) => void
  onAbsorb: (accountId: string) => void
  onLogMissing: (initial: QuickAddInitial) => void
  animationDelay: string
  usdRate: number
  startExpanded?: boolean
  /** Rendered inside a sheet dialog: no card chrome, actions in a sticky footer. */
  embedded?: boolean
}

function formatNativeAmount(amount: number, currency: Account['currency']) {
  return currency === 'USD' ? formatUsd(amount) : formatK(amount)
}

function DriftChip({
  drift,
  currency,
}: {
  drift: number
  currency: Account['currency']
}) {
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
      {formatNativeAmount(drift, currency)}
    </Badge>
  )
}

export function ReconcileCard({
  accounts,
  categories,
  balances,
  closed,
  lastClosed,
  onActualChange,
  onAbsorb,
  onLogMissing,
  animationDelay,
  usdRate,
  startExpanded = false,
  embedded = false,
}: ReconcileCardProps) {
  const [expanded, setExpanded] = useState(startExpanded)
  const visibleBalances = balances.filter((balance) => {
    const account = accounts.find((item) => item.id === balance.accountId)
    return account ? isSpendableAccount(account) : false
  })
  const gaps = visibleBalances.filter(
    (balance) => balance.actual !== balance.expected,
  )
  const gapTotalMwk = gaps.reduce((sum, balance) => {
    const account = accounts.find((item) => item.id === balance.accountId)
    if (!account) return sum
    return (
      sum +
      currencyToMwk(
        Math.abs(balance.actual - balance.expected),
        account.currency,
        usdRate,
      )
    )
  }, 0)
  const actions = (button: ReactNode) =>
    embedded ? (
      <DialogFooter sticky className="mt-4">
        {button}
      </DialogFooter>
    ) : (
      button
    )

  const body = (
    <>
      <div
        className={cn(
          'flex items-center justify-between gap-3',
          embedded && 'pr-10',
        )}
      >
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
          {actions(
            <Button
              type="button"
              variant="secondary"
              className={cn('w-full', !embedded && 'mt-3')}
              onClick={() => setExpanded(true)}
            >
              Check balances again
            </Button>,
          )}
        </>
      ) : expanded ? (
        <>
          <div className="mt-4 space-y-2">
            {visibleBalances.map((balance) => {
              const account = accounts.find(
                (item) => item.id === balance.accountId,
              )
              if (!account) return null
              const drift = balance.actual - balance.expected
              return (
                <div
                  key={balance.accountId}
                  className="rounded-xl border border-(--line) bg-(--chip-bg) px-3.5 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-sea-ink">
                      {account.name}
                    </span>
                    <DriftChip drift={drift} currency={account.currency} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[0.75rem] text-sea-ink-soft tabular-nums">
                      Expected{' '}
                      {formatNativeAmount(balance.expected, account.currency)}
                    </span>
                    <Input
                      type="number"
                      step={account.currency === 'USD' ? '0.01' : '1'}
                      aria-label={`${account.name} actual balance`}
                      className="font-mono h-10 w-28 sm:h-9 rounded-lg px-2.5 py-1.5 text-right tabular-nums"
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
                            mode: drift > 0 ? 'income' : 'expense',
                            amount: Math.abs(drift),
                            amountCurrency: account.currency,
                            fxRate:
                              account.currency === 'USD' ? usdRate : undefined,
                            accountId: balance.accountId,
                            categoryId:
                              drift < 0
                                ? firstExpenseCategoryKey(categories)
                                : undefined,
                            reconcile: true,
                          })
                        }
                      >
                        {drift > 0
                          ? 'Log missing income'
                          : 'Log missing expense'}
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
                  {formatK(gapTotalMwk)}
                </span>{' '}
                MWK equivalent. Fix each account above.
              </p>
            </div>
          )}
          {actions(
            <Button
              type="button"
              variant="ghost"
              className={cn(!embedded && 'mt-3')}
              onClick={() => setExpanded(false)}
            >
              Close
            </Button>,
          )}
        </>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {visibleBalances.map((balance) => {
              const account = accounts.find(
                (item) => item.id === balance.accountId,
              )
              if (!account) return null
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
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-sea-ink">
                    {account.name}
                  </span>
                  <span className="font-mono shrink-0 text-right text-[0.8rem] whitespace-nowrap text-sea-ink-soft tabular-nums">
                    {formatNativeAmount(balance.expected, account.currency)}
                  </span>
                  <DriftChip drift={drift} currency={account.currency} />
                </div>
              )
            })}
          </div>
          {actions(
            <Button
              type="button"
              className={cn('w-full', !embedded && 'mt-4')}
              onClick={() => setExpanded(true)}
            >
              Reconcile now
            </Button>,
          )}
        </>
      )}
    </>
  )

  if (embedded) return <div className="flex flex-col">{body}</div>

  return (
    <Card
      variant="island"
      className="rise-in gap-0 rounded-3xl p-5 sm:p-6"
      style={{ animationDelay }}
    >
      {body}
    </Card>
  )
}
