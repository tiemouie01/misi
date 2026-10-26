import { Link } from '@tanstack/react-router'
import {
  ArchiveRestore,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react'

import { Button } from '#/components/ui/button'
import { formatK } from '#/lib/app-data'
import { cn } from '#/lib/utils'

import type { Debt } from '#/lib/app-data'

/** One debt: direction icon, name, what's left, and restore when archived. */
export function DebtRow({
  debt,
  onRestore,
}: {
  debt: Debt
  onRestore: (debt: Debt) => void
}) {
  const youOwe = debt.direction === 'you_owe'
  const Icon = youOwe ? ArrowUpRight : ArrowDownLeft

  return (
    <li className="flex items-center gap-1">
      <Link
        to="/app/debts/$debtId"
        params={{ debtId: debt.id }}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-3 no-underline transition-colors hover:bg-(--chip-bg) sm:px-2"
      >
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl',
            debt.archived
              ? 'bg-(--chip-bg) text-sea-ink-soft'
              : youOwe
                ? 'bg-coral/12 text-coral-deep'
                : 'bg-palm/12 text-palm',
          )}
        >
          <Icon className="size-[1.125rem]" />
        </span>
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
            'shrink-0 font-bold tabular-nums',
            debt.archived
              ? 'text-sea-ink-soft'
              : youOwe
                ? 'text-coral-deep'
                : 'text-palm',
          )}
        >
          {formatK(debt.remaining)}
        </span>
        {!debt.archived && (
          <ChevronRight className="size-4 shrink-0 text-sea-ink-soft transition-transform group-hover:translate-x-0.5" />
        )}
      </Link>
      {debt.archived && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-lagoon-deep"
          aria-label={`Restore ${debt.name}`}
          onClick={() => onRestore(debt)}
        >
          <ArchiveRestore className="size-4" />
        </Button>
      )}
    </li>
  )
}
