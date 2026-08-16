import { Droplets, Scale, Settings2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  accountKindColor,
  accountMwkValue,
  formatK,
  isSpendableAccount,
} from '#/lib/app-data'
import { mutationErrorMessage } from '#/lib/use-quick-add-sheet'
import { cn } from '#/lib/utils'

import type { Account, AllocationDirection, Wallet } from '#/lib/app-data'

interface NetWorthCardProps {
  accounts: Account[]
  envelopes: Wallet[]
  youOwe: number
  owedToYou: number
  activeDebtCount: number
  netWorth: number
  spendable: number
  savingsBalance: number
  cycleGain: number
  usdRate: number
  animationDelay: string
  onMoveSavings: (input: {
    amount: number
    direction: AllocationDirection
  }) => Promise<void>
  onSetAccountSpendable: (
    accountId: string,
    includeInSpendable: boolean,
  ) => void
}

interface DisplayRow {
  id: string
  name: string
  amount: number
  amountLabel: string
  color: string
  ratioBase?: number
  muted?: boolean
  hint?: string
}

function BalanceRows({ rows }: { rows: DisplayRow[] }) {
  const largest = Math.max(...rows.map((row) => Math.abs(row.amount)), 1)

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const width = row.ratioBase
          ? (Math.max(row.amount, 0) / Math.max(row.ratioBase, 1)) * 100
          : (Math.abs(row.amount) / largest) * 100
        return (
          <div
            key={row.id}
            className={cn('flex items-center gap-3', row.muted && 'opacity-60')}
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: row.color }}
            />
            <span className="w-24 shrink-0 truncate text-sm font-semibold text-sea-ink">
              {row.name}
              {row.hint && (
                <span className="mt-0.5 block text-[0.65rem] font-semibold tracking-wide text-sea-ink-soft uppercase">
                  {row.hint}
                </span>
              )}
            </span>
            <div
              role="progressbar"
              aria-label={`${row.name} relative balance`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(width, 100))}
              aria-valuetext={row.amountLabel}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--line)"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(8, Math.min(width, 100))}%`,
                  background: `linear-gradient(90deg, ${row.color}, var(--lagoon))`,
                }}
              />
            </div>
            <span className="font-mono w-24 shrink-0 text-right text-[0.8rem] text-sea-ink-soft tabular-nums">
              {row.amountLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MoveMoneyDialog({
  open,
  spendable,
  savingsBalance,
  onOpenChange,
  onMoveSavings,
}: {
  open: boolean
  spendable: number
  savingsBalance: number
  onOpenChange: (open: boolean) => void
  onMoveSavings: (input: {
    amount: number
    direction: AllocationDirection
  }) => Promise<void>
}) {
  const [direction, setDirection] = useState<AllocationDirection>('toSavings')
  const [digits, setDigits] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const amount = Number(digits)
  const spendingEnvelope = spendable - savingsBalance
  const available =
    direction === 'toSavings' ? spendingEnvelope : savingsBalance
  const canConfirm =
    Number.isFinite(amount) && amount > 0 && amount <= available && !busy

  function reset() {
    setDirection('toSavings')
    setDigits('')
    setError(null)
    setBusy(false)
  }

  async function confirm() {
    if (!canConfirm) return
    setError(null)
    setBusy(true)
    try {
      await onMoveSavings({ amount, direction })
      reset()
      onOpenChange(false)
    } catch (caught) {
      setError(mutationErrorMessage(caught, 'Unable to move money. Try again.'))
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && busy) return
        if (!nextOpen) reset()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move money</DialogTitle>
          <DialogDescription>
            Shift how spendable money is earmarked. Account balances stay put.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={direction}
          onValueChange={(value) =>
            setDirection(value === 'toSpending' ? 'toSpending' : 'toSavings')
          }
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="toSavings">To savings</TabsTrigger>
            <TabsTrigger value="toSpending">To spending</TabsTrigger>
          </TabsList>
        </Tabs>
        <div>
          <Label htmlFor="move-savings-amount">Amount (MWK)</Label>
          <Input
            id="move-savings-amount"
            inputMode="decimal"
            className="font-mono mt-2 tabular-nums"
            placeholder="0"
            value={digits}
            onChange={(event) =>
              setDigits(event.target.value.replace(/[^\d.]/g, ''))
            }
          />
          <p className="mt-1.5 text-[0.8rem] text-sea-ink-soft">
            Available:{' '}
            <span className="font-mono font-semibold text-sea-ink tabular-nums">
              {formatK(Math.max(0, available))}
            </span>
          </p>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
          >
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={() => void confirm()}
          >
            {busy ? 'Moving…' : 'Move money'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ManageAccountsDialog({
  open,
  accounts,
  onOpenChange,
  onSetAccountSpendable,
}: {
  open: boolean
  accounts: Account[]
  onOpenChange: (open: boolean) => void
  onSetAccountSpendable: (
    accountId: string,
    includeInSpendable: boolean,
  ) => void
}) {
  const [pending, setPending] = useState<Record<string, boolean>>({})

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage accounts</DialogTitle>
          <DialogDescription>
            Choose which accounts count toward Spendable. Investment accounts
            stay out unless you opt them in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {accounts.map((account) => {
            const spendable = pending[account.id] ?? isSpendableAccount(account)
            return (
              <div
                key={account.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-(--line) bg-(--chip-bg) px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-sea-ink">
                    {account.name}
                  </p>
                  <p className="text-[0.75rem] text-sea-ink-soft">
                    Counts toward spendable
                  </p>
                </div>
                <Switch
                  checked={spendable}
                  aria-label={`Counts toward spendable: ${account.name}`}
                  onCheckedChange={(checked) => {
                    setPending((current) => ({
                      ...current,
                      [account.id]: checked,
                    }))
                    onSetAccountSpendable(account.id, checked)
                  }}
                />
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function NetWorthCard({
  accounts,
  envelopes,
  youOwe,
  owedToYou,
  activeDebtCount,
  netWorth,
  spendable,
  savingsBalance,
  cycleGain,
  usdRate,
  animationDelay,
  onMoveSavings,
  onSetAccountSpendable,
}: NetWorthCardProps) {
  const [view, setView] = useState<'accounts' | 'wallets'>('accounts')
  const [moveOpen, setMoveOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)

  const accountRows: DisplayRow[] = accounts.map((account) => {
    const spendableAccount = isSpendableAccount(account)
    return {
      id: account.id,
      name: account.name,
      amount: accountMwkValue(account, usdRate),
      amountLabel:
        account.currency === 'USD'
          ? `$${account.balance.toFixed(2)}`
          : formatK(account.balance),
      color: accountKindColor(account),
      muted: !spendableAccount,
      hint: spendableAccount ? undefined : 'not spendable',
    }
  })
  const envelopeRows: DisplayRow[] = envelopes.map((envelope) => ({
    id: envelope.id,
    name: envelope.name,
    amount: envelope.balance,
    amountLabel: formatK(envelope.balance),
    color: envelope.id === 'spending' ? 'var(--lagoon)' : 'var(--palm)',
    ratioBase: spendable,
  }))
  const claimSummaryRows: DisplayRow[] = [
    {
      id: 'you-owe',
      name: 'You owe',
      amount: youOwe,
      amountLabel: formatK(youOwe),
      color: 'var(--coral)',
    },
    {
      id: 'owed-to-you',
      name: 'Owed to you',
      amount: owedToYou,
      amountLabel: formatK(owedToYou),
      color: 'var(--palm)',
    },
  ]

  return (
    <Card
      variant="island"
      className="rise-in gap-0 rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="island-kicker">Spendable</p>
          <p className="font-display mt-1.5 text-4xl font-bold tracking-tight text-sea-ink tabular-nums">
            {formatK(spendable)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-palm">
            <Droplets className="size-3.5" />
            <span className="font-mono tabular-nums">
              {cycleGain >= 0 ? '+' : ''}
              {formatK(cycleGain)}
            </span>{' '}
            this cycle
          </p>
          <p className="mt-1 text-sm text-sea-ink-soft">
            Net worth{' '}
            <span className="font-mono font-semibold text-sea-ink tabular-nums">
              {formatK(netWorth)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Manage accounts"
            onClick={() => setManageOpen(true)}
          >
            <Settings2 className="size-4" />
          </Button>
          <Badge variant="secondary" className="uppercase">
            MWK
          </Badge>
        </div>
      </div>
      <Tabs
        value={view}
        onValueChange={(value) =>
          setView(value === 'wallets' ? 'wallets' : 'accounts')
        }
        className="mt-5 gap-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="wallets">Envelopes</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts">
          <BalanceRows rows={accountRows} />
        </TabsContent>
        <TabsContent value="wallets">
          <BalanceRows rows={envelopeRows} />
          {activeDebtCount > 0 && (
            <Link
              to="/app/debts"
              className="mt-5 block rounded-2xl border border-dashed border-(--line) p-4 no-underline transition-colors hover:bg-(--chip-bg)"
            >
              <p className="island-kicker mb-3 flex items-center gap-1.5">
                <Scale className="size-3.5" />
                Debts
              </p>
              <BalanceRows rows={claimSummaryRows} />
            </Link>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => setMoveOpen(true)}
          >
            Move money
          </Button>
        </TabsContent>
      </Tabs>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-dashed border-(--line) pt-4">
        <Badge variant="secondary" className="border-transparent">
          USD @ K{usdRate.toLocaleString('en-US')}
        </Badge>
        <Badge variant="secondary" className="border-transparent">
          Cycle anchored to the 20th
        </Badge>
      </div>
      <MoveMoneyDialog
        open={moveOpen}
        spendable={spendable}
        savingsBalance={savingsBalance}
        onOpenChange={setMoveOpen}
        onMoveSavings={onMoveSavings}
      />
      <ManageAccountsDialog
        open={manageOpen}
        accounts={accounts}
        onOpenChange={setManageOpen}
        onSetAccountSpendable={onSetAccountSpendable}
      />
    </Card>
  )
}
