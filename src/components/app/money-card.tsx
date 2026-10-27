import { Link } from '@tanstack/react-router'
import {
  Banknote,
  Landmark,
  PiggyBank,
  Plus,
  Smartphone,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'

import {
  AddAccountDialog,
  MoveMoneyDialog,
} from '#/components/app/account-dialogs'
import { spendingEnvelopeBalance } from '../../../shared/savings'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  accountKindColor,
  accountMwkValue,
  formatAccountAmount,
  formatK,
  isSpendableAccount,
} from '#/lib/app-data'
import { cn } from '#/lib/utils'

import type { NewAccountInput } from '#/components/app/account-dialogs'
import type { Account, AllocationDirection } from '#/lib/app-data'

const KIND_ICON = {
  bank: Landmark,
  mobile: Smartphone,
  cash: Banknote,
  investment: TrendingUp,
} as const

interface MoneyCardProps {
  /** Every account, archived included: names stay taken while archived. */
  accounts: Account[]
  usdRate: number
  spendable: number
  savingsBalance: number
  onMoveSavings: (input: {
    amount: number
    direction: AllocationDirection
  }) => Promise<void>
  onCreateAccount: (input: NewAccountInput) => Promise<void>
  className?: string
}

export function MoneyCard({
  accounts,
  usdRate,
  spendable,
  savingsBalance,
  onMoveSavings,
  onCreateAccount,
  className,
}: MoneyCardProps) {
  const [moveOpen, setMoveOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const activeAccounts = accounts.filter((account) => !account.archived)
  const freeToSpend = spendingEnvelopeBalance(spendable, savingsBalance)
  const usingSavings = freeToSpend < 0

  return (
    <Card variant="panel" className={cn('gap-0 p-4 sm:p-5', className)}>
      <h2 className="px-1 text-lg font-bold text-sea-ink">
        Where your money is
      </h2>

      {/* Spendable money split in two: what's free and what's kept aside.
          The -mx-2/px-3 inset lines the rows up with the accounts below. */}
      <div
        className={cn(
          '-mx-2 mt-3 divide-y divide-(--line) rounded-2xl px-3',
          usingSavings ? 'bg-coral/10' : 'bg-lagoon-deep/6',
        )}
      >
        <div className="flex items-center gap-3 py-3">
          <span className="grid size-9 shrink-0 place-items-center">
            <Wallet
              className={cn(
                'size-5',
                usingSavings ? 'text-coral-deep' : 'text-lagoon-deep',
              )}
            />
          </span>
          <p className="min-w-0 flex-1 font-semibold text-sea-ink">
            Free to spend
            {usingSavings && (
              <span className="block text-[0.8rem] text-coral-deep">
                You're using your savings
              </span>
            )}
          </p>
          <span
            className={cn(
              'font-bold tabular-nums',
              usingSavings ? 'text-coral-deep' : 'text-sea-ink',
            )}
          >
            {formatK(freeToSpend)}
          </span>
        </div>
        <div className="flex items-center gap-3 py-2">
          <span className="grid size-9 shrink-0 place-items-center">
            <PiggyBank className="size-5 text-palm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sea-ink">Kept aside in Savings</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 px-2 text-[0.8rem] font-bold text-lagoon-deep"
              onClick={() => setMoveOpen(true)}
            >
              {savingsBalance > 0 ? 'Move money' : 'Put money aside'}
            </Button>
          </div>
          <span className="font-bold text-sea-ink tabular-nums">
            {formatK(savingsBalance)}
          </span>
        </div>
      </div>

      <ul className="mt-2 divide-y divide-(--line)">
        {activeAccounts.map((account) => {
          const Icon = KIND_ICON[account.kind]
          const color = accountKindColor(account)
          const spendableAccount = isSpendableAccount(account)
          return (
            <li key={account.id} className="flex items-center gap-3 px-1 py-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl"
                style={{
                  background: `color-mix(in oklab, ${color} 14%, transparent)`,
                  color,
                }}
              >
                <Icon className="size-[1.125rem]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-sea-ink">
                  {account.name}
                </span>
                {!spendableAccount && (
                  <span className="block text-[0.8rem] text-sea-ink-soft">
                    Not counted for spending
                  </span>
                )}
              </span>
              <span className="text-right">
                <span className="block font-bold text-sea-ink tabular-nums">
                  {formatAccountAmount(account)}
                </span>
                {account.currency === 'USD' && (
                  <span className="block text-[0.8rem] text-sea-ink-soft tabular-nums">
                    ≈ {formatK(accountMwkValue(account, usdRate))}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      <Button
        type="button"
        variant="ghost"
        className="justify-start self-start px-2 text-lagoon-deep"
        onClick={() => setAddOpen(true)}
      >
        <Plus />
        Add account
      </Button>

      <Link
        to="/app"
        search={{ task: 'reconcile' }}
        className={cn(buttonVariants({ variant: 'secondary' }), 'mt-4 w-full')}
      >
        Check my real balances
      </Link>

      <MoveMoneyDialog
        open={moveOpen}
        spendable={spendable}
        savingsBalance={savingsBalance}
        onOpenChange={setMoveOpen}
        onMoveSavings={onMoveSavings}
      />
      <AddAccountDialog
        open={addOpen}
        accounts={accounts}
        onOpenChange={setAddOpen}
        onCreateAccount={onCreateAccount}
      />
    </Card>
  )
}
