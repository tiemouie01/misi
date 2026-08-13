import {
  ArrowDownToLine,
  ArrowLeftRight,
  Droplets,
  Tag,
  Trash2,
} from 'lucide-react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  canDeleteTransaction,
  canMutateTransaction,
  formatK,
} from '#/lib/app-data'
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
  onDelete: (transaction: Txn) => void
}

interface TransactionDeleteDialogProps {
  transaction: Txn | null
  error?: string | null
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}

function transactionAmountLabel(transaction: Txn) {
  if (transaction.type === 'expense') return formatK(-transaction.amount)
  if (transaction.type === 'income') return `+${formatK(transaction.amount)}`
  return formatK(transaction.amount)
}

function allocationLabel(transaction: Txn) {
  return transaction.direction === 'toSpending' ? '→ Spending' : '→ Savings'
}

export function TransactionDeleteDialog({
  transaction,
  error,
  busy,
  onCancel,
  onConfirm,
}: TransactionDeleteDialogProps) {
  return (
    <AlertDialog
      open={transaction !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {transaction?.payee ?? 'transaction'}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {transaction?.type === 'allocation'
              ? `This permanently removes the ${formatK(transaction.amount)} envelope move. Account balances stay put.`
              : transaction
                ? `This permanently removes ${transactionAmountLabel(transaction)} and reverses it on your accounts.`
                : 'This permanently removes the transaction and reverses it on your accounts.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
          >
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Deleting…' : 'Delete transaction'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function TransactionsCard({
  transactions,
  accounts,
  categories,
  cycleLabel,
  animationDelay,
  onEdit,
  onDelete,
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
                const account = transaction.accountId
                  ? accounts.find((item) => item.id === transaction.accountId)
                  : undefined
                const toAccount = transaction.toAccountId
                  ? accounts.find((item) => item.id === transaction.toAccountId)
                  : undefined
                const category = resolveCategory(
                  categories,
                  transaction.categoryId,
                )
                const isAllocation = transaction.type === 'allocation'
                const Icon = isAllocation
                  ? Droplets
                  : transaction.type === 'transfer'
                    ? ArrowLeftRight
                    : transaction.type === 'income'
                      ? ArrowDownToLine
                      : (category?.icon ?? Tag)
                const color = isAllocation
                  ? 'var(--lagoon)'
                  : transaction.type === 'income'
                    ? 'var(--palm)'
                    : transaction.type === 'transfer'
                      ? 'var(--lagoon-deep)'
                      : (category?.color ?? 'var(--lagoon-deep)')
                const title = isAllocation
                  ? allocationLabel(transaction)
                  : transaction.payee
                const subline = isAllocation
                  ? transaction.autoSave
                    ? 'Auto-save'
                    : transaction.payee
                  : transaction.type === 'transfer'
                    ? transaction.toAccountId
                      ? `${account?.name ?? 'Account'} → ${toAccount?.name ?? 'Account'}`
                      : `Savings · ${account?.name ?? 'Account'}`
                    : transaction.type === 'income'
                      ? `Income · ${account?.name ?? 'Account'}`
                      : `${category?.name ?? transaction.categoryId ?? 'Expense'} · ${account?.name ?? 'Account'}`
                const amountLabel = transactionAmountLabel(transaction)
                const canEdit = canMutateTransaction(transaction)
                const canDelete = canDeleteTransaction(transaction)
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-0.5"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!canEdit}
                      aria-label={
                        canEdit
                          ? transaction.autoSave
                            ? `Edit ${title}`
                            : `Edit ${title} transaction`
                          : undefined
                      }
                      title={
                        canEdit
                          ? transaction.autoSave
                            ? 'Edit auto-save'
                            : 'Edit transaction'
                          : isAllocation
                            ? 'Envelope moves can be deleted but not edited'
                            : 'Generated transactions cannot be edited'
                      }
                      className="group h-auto min-w-0 flex-1 justify-start gap-3 whitespace-normal rounded-xl px-2 py-2.5 text-left disabled:opacity-100"
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
                          {title}
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
                            : transaction.type === 'transfer' || isAllocation
                              ? 'text-sea-ink-soft'
                              : 'text-sea-ink'
                        }`}
                      >
                        {amountLabel}
                      </span>
                    </Button>
                    {canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${title} transaction`}
                        title="Delete transaction"
                        className="size-9 shrink-0 text-sea-ink-soft hover:bg-coral/10 hover:text-coral-deep"
                        onClick={() => onDelete(transaction)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </Card>
  )
}
