import { ArrowDownToLine, ArrowLeftRight } from 'lucide-react'

import { categories, formatK } from '#/lib/app-data'

import type { Account, Txn } from '#/lib/app-data'

interface TransactionsCardProps {
  transactions: Txn[]
  accounts: Account[]
  animationDelay: string
}

export function TransactionsCard({
  transactions,
  accounts,
  animationDelay,
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
    <section
      className="island-shell rise-in rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="island-kicker">Recent activity</p>
        <span className="font-mono text-[0.72rem] font-semibold text-sea-ink-soft">
          Jul cycle
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
              <p className="text-[0.72rem] font-bold tracking-widest text-sea-ink-soft uppercase">
                {group.day}
              </p>
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
                const category = categories.find(
                  (item) => item.id === transaction.categoryId,
                )
                const Icon =
                  transaction.type === 'transfer'
                    ? ArrowLeftRight
                    : transaction.type === 'income'
                      ? ArrowDownToLine
                      : category?.icon
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
                      : `${category?.name ?? 'Expense'} · ${account?.name ?? 'Account'}`
                const amountLabel =
                  transaction.type === 'expense'
                    ? formatK(-transaction.amount)
                    : transaction.type === 'income'
                      ? `+${formatK(transaction.amount)}`
                      : formatK(transaction.amount)
                return (
                  <div
                    key={transaction.id}
                    className={`flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-(--chip-bg) ${transaction.id.startsWith('new-') ? 'rise-in' : ''}`}
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-lg"
                      style={{
                        background: `color-mix(in oklab, ${color} 14%, transparent)`,
                        color,
                      }}
                    >
                      {Icon && <Icon className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-sea-ink">
                        {transaction.payee}
                      </p>
                      <p className="text-[0.75rem] text-sea-ink-soft">
                        {subline}
                        {transaction.items && (
                          <>
                            {' · '}
                            <span className="italic">
                              items: {transaction.items}
                            </span>
                          </>
                        )}
                        {transaction.reconcile && ' · Reconcile'}
                      </p>
                    </div>
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
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}
