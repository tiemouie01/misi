import { ArrowDownToLine, ArrowLeftRight, Tag } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { formatK } from '#/lib/app-data'
import { resolveCategory } from '#/lib/categories'

import type { Account, Txn } from '#/lib/app-data'
import type { Category } from '#/lib/categories'

interface TransactionsCardProps {
  transactions: Txn[]
  accounts: Account[]
  categories: Category[]
  cycleLabel: string
  animationDelay: string
  onEdit: (transaction: Txn) => void
}

export function TransactionsCard({
  transactions,
  accounts,
  categories,
  cycleLabel,
  animationDelay,
  onEdit,
}: TransactionsCardProps) {
  const groups = transactions.reduce<Array<{ day: string; txns: Txn[] }>>(
    (result, transaction) => {
      const group = result.find((item) => item.day === transaction.day)
      if (group) group.txns.push(transaction)
      else result.push({ day: transaction.day, txns: [transaction] })
      return result
    },
    [],
  )

  return (
    <Card
      variant="island"
      className="rise-in gap-0 rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="island-kicker">Recent activity</p>
        <span className="font-mono text-[0.72rem] font-semibold text-sea-ink-soft">
          {cycleLabel}
        </span>
      </div>
      {groups.map((group, groupIndex) => {
        const expenseTotal = group.txns
          .filter((transaction) => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + transaction.amount, 0)
        return (
          <div key={group.day}>
            <div
              className={`${groupIndex === 0 ? 'mt-4' : 'mt-5'} flex items-baseline justify-between`}
            >
              <p className="field-label">{group.day}</p>
              {expenseTotal > 0 && (
                <span className="font-mono text-[0.75rem] text-sea-ink-soft tabular-nums">
                  {formatK(-expenseTotal)}
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1">
              {group.txns.map((transaction) => {
                const account = accounts.find(
                  (item) => item.id === transaction.accountId,
                )
                const toAccount = accounts.find(
                  (item) => item.id === transaction.toAccountId,
                )
                const category = resolveCategory(
                  categories,
                  transaction.categoryId,
                )
                const Icon =
                  transaction.type === 'transfer'
                    ? ArrowLeftRight
                    : transaction.type === 'income'
                      ? ArrowDownToLine
                      : (category?.icon ?? Tag)
                const color =
                  transaction.type === 'income'
                    ? 'var(--palm)'
                    : transaction.type === 'transfer'
                      ? 'var(--lagoon-deep)'
                      : (category?.color ?? 'var(--lagoon-deep)')
                const subline =
                  transaction.type === 'transfer'
                    ? transaction.toAccountId
                      ? `${account?.name ?? 'Account'} → ${toAccount?.name ?? 'Account'}`
                      : `Savings · ${account?.name ?? 'Account'}`
                    : transaction.type === 'income'
                      ? `Income · ${account?.name ?? 'Account'}`
                      : `${category?.name ?? transaction.categoryId ?? 'Expense'} · ${account?.name ?? 'Account'}`
                const amountLabel =
                  transaction.type === 'expense'
                    ? formatK(-transaction.amount)
                    : transaction.type === 'income'
                      ? `+${formatK(transaction.amount)}`
                      : formatK(transaction.amount)
                const canEdit = !transaction.adjustment && !transaction.autoSave
                return (
                  <Button
                    key={transaction.id}
                    type="button"
                    variant="ghost"
                    disabled={!canEdit}
                    aria-label={
                      canEdit
                        ? `Edit ${transaction.payee} transaction`
                        : undefined
                    }
                    title={
                      canEdit
                        ? 'Edit transaction'
                        : 'Generated transactions cannot be edited'
                    }
                    className="group h-auto w-full justify-start gap-3 whitespace-normal rounded-xl px-2 py-2.5 text-left disabled:opacity-100"
                    onClick={() => onEdit(transaction)}
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-lg"
                      style={{
                        background: `color-mix(in oklab, ${color} 14%, transparent)`,
                        color,
                      }}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-sea-ink">
                        {transaction.payee}
                      </span>
                      <span className="block text-[0.75rem] text-sea-ink-soft">
                        {subline}
                        {transaction.items && (
                          <>
                            {' · '}
                            <span className="italic">
                              items: {transaction.items}
                            </span>
                          </>
                        )}
                        {transaction.adjustment && ' · Reconcile'}
                      </span>
                    </span>
                    <span
                      className={`font-mono shrink-0 text-sm font-semibold tabular-nums ${
                        transaction.type === 'income'
                          ? 'text-palm'
                          : transaction.type === 'transfer'
                            ? 'text-sea-ink-soft'
                            : 'text-sea-ink'
                      }`}
                    >
                      {amountLabel}
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>
        )
      })}
    </Card>
  )
}
