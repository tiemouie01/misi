import { Droplets } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '#/components/ui/badge'
import { Card } from '#/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  CYCLE,
  CYCLE_BUDGET,
  USD_RATE,
  accountKindColor,
  accountMwkValue,
  formatK,
  seedWallets,
} from '#/lib/app-data'

import type { Account } from '#/lib/app-data'

interface NetWorthCardProps {
  accounts: Account[]
  netWorth: number
  spendingLeft: number
  savingsBalance: number
  animationDelay: string
}

interface DisplayRow {
  id: string
  name: string
  amount: number
  amountLabel: string
  color: string
  ratioBase?: number
}

function BalanceRows({ rows }: { rows: DisplayRow[] }) {
  const largest = Math.max(...rows.map((row) => row.amount), 1)

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const width = row.ratioBase
          ? (row.amount / row.ratioBase) * 100
          : (row.amount / largest) * 100
        return (
          <div key={row.id} className="flex items-center gap-3">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: row.color }}
            />
            <span className="w-24 shrink-0 truncate text-sm font-semibold text-sea-ink">
              {row.name}
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

export function NetWorthCard({
  accounts,
  netWorth,
  spendingLeft,
  savingsBalance,
  animationDelay,
}: NetWorthCardProps) {
  const [view, setView] = useState<'accounts' | 'wallets'>('accounts')

  const accountRows: DisplayRow[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    amount: accountMwkValue(account),
    amountLabel:
      account.currency === 'USD'
        ? `$${account.balance.toFixed(2)}`
        : formatK(account.balance),
    color: accountKindColor(account),
  }))
  const walletRows: DisplayRow[] = seedWallets.map((wallet) => {
    const balance =
      wallet.id === 'spending'
        ? spendingLeft
        : wallet.id === 'savings'
          ? savingsBalance
          : wallet.balance
    const color =
      wallet.id === 'spending'
        ? 'var(--lagoon)'
        : wallet.id === 'unit-trust'
          ? 'var(--lagoon-deep)'
          : wallet.id === 'debt'
            ? 'var(--coral)'
            : 'var(--palm)'
    return {
      id: wallet.id,
      name: wallet.name,
      amount: wallet.currency === 'USD' ? balance * USD_RATE : balance,
      amountLabel:
        wallet.currency === 'USD' ? `$${balance.toFixed(2)}` : formatK(balance),
      color,
      ratioBase: wallet.id === 'spending' ? CYCLE_BUDGET : undefined,
    }
  })
  return (
    <Card
      variant="island"
      className="rise-in gap-0 rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="island-kicker">Total across everything</p>
          <p className="font-display mt-1.5 text-4xl font-bold tracking-tight text-sea-ink tabular-nums">
            {formatK(netWorth)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-palm">
            <Droplets className="size-3.5" />
            <span className="font-mono tabular-nums">
              +{formatK(CYCLE.cycleGain)}
            </span>{' '}
            this cycle
          </p>
        </div>
        <Badge variant="secondary" className="uppercase">
          MWK
        </Badge>
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
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts">
          <BalanceRows rows={accountRows} />
        </TabsContent>
        <TabsContent value="wallets">
          <BalanceRows rows={walletRows} />
        </TabsContent>
      </Tabs>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-dashed border-(--line) pt-4">
        <Badge variant="secondary" className="border-transparent">
          USD @ K{USD_RATE.toLocaleString('en-US')}
        </Badge>
        <Badge variant="secondary" className="border-transparent">
          Cycle anchored to the 20th
        </Badge>
      </div>
    </Card>
  )
}
