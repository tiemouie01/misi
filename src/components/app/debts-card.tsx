import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

import { sortDebtsByRemaining } from '../../../shared/claim'

import { Card } from '#/components/ui/card'
import { formatK } from '#/lib/app-data'
import { cn } from '#/lib/utils'

import type { Debt } from '#/lib/app-data'

const SHOWN_DEBTS = 3

/** The largest open debts, each linking to its page. Hidden when none. */
export function DebtsCard({
  debts,
  className,
}: {
  debts: Debt[]
  className?: string
}) {
  const open = sortDebtsByRemaining(debts.filter((debt) => !debt.archived))
  if (open.length === 0) return null

  return (
    <Card variant="panel" className={cn('gap-0 p-4 sm:p-5', className)}>
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-lg font-bold text-sea-ink">Debts</h2>
        <Link
          to="/app/debts"
          className="text-sm font-bold text-lagoon-deep no-underline hover:underline"
        >
          {open.length > SHOWN_DEBTS ? `See all ${open.length}` : 'See all'}
        </Link>
      </div>
      <ul className="mt-2 space-y-0.5">
        {open.slice(0, SHOWN_DEBTS).map((debt) => {
          const youOwe = debt.direction === 'you_owe'
          return (
            <li key={debt.id}>
              <Link
                to="/app/debts/$debtId"
                params={{ debtId: debt.id }}
                className="group flex items-center gap-3 rounded-2xl px-1 py-2.5 no-underline transition-colors hover:bg-(--chip-bg)"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-sea-ink">
                    {debt.name}
                  </span>
                  <span className="block text-[0.8rem] text-sea-ink-soft">
                    {youOwe ? 'You owe' : 'Owed to you'}
                  </span>
                </span>
                <span
                  className={cn(
                    'font-bold tabular-nums',
                    youOwe ? 'text-coral-deep' : 'text-palm',
                  )}
                >
                  {formatK(debt.remaining)}
                </span>
                <ChevronRight className="size-4 text-sea-ink-soft transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
