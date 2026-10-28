import {
  ArrowDownToLine,
  ArrowLeftRight,
  PiggyBank,
  ReceiptText,
  Scale,
  Tag,
} from 'lucide-react'

import { claimFeedTitle } from '../../../shared/claim'

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
import { cn } from '#/lib/utils'

import type { PaginationStatus } from 'convex/react'
import type { Account, Txn } from '#/lib/app-data'
import type { Category } from '#/lib/categories'

interface TransactionsCardProps {
  transactions: Txn[]
  accounts: Account[]
  categories: Category[]
  status: PaginationStatus
  onLoadMore: () => void
  onEdit: (transaction: Txn) => void
  onDelete: (transaction: Txn) => void
  className?: string
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
  if (transaction.type === 'claim') {
    const action = transaction.claimAction
    if (action === 'borrow' || action === 'collect') {
      return transaction.accountId
        ? `+${formatK(transaction.amount)}`
        : formatK(transaction.amount)
    }
    if (action === 'repay' || action === 'lend') {
      return transaction.accountId
        ? formatK(-transaction.amount)
        : formatK(transaction.amount)
    }
  }
  return formatK(transaction.amount)
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
              : transaction?.type === 'claim' && !transaction.accountId
                ? `This permanently removes ${formatK(transaction.amount)} from the debt ledger. Account balances stay put.`
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

interface RowCopy {
  icon: typeof Tag
  color: string
  title: string
  /** Shown under the title, e.g. the category when the payee differs. */
  detail?: string
  /** Where the money came from or went, in plain words. */
  account: string
}

function rowCopy(
  transaction: Txn,
  accounts: Account[],
  categories: Category[],
): RowCopy {
  const accountName = (id?: string) =>
    accounts.find((account) => account.id === id)?.name ?? 'an account'
  const extras = [
    transaction.items ? `Items: ${transaction.items}` : null,
    transaction.adjustment ? 'Balance check' : null,
  ]

  function withExtras(copy: RowCopy): RowCopy {
    const detail = [copy.detail, ...extras].filter(Boolean).join(' · ')
    return { ...copy, detail: detail || undefined }
  }

  switch (transaction.type) {
    case 'income':
      return withExtras({
        icon: ArrowDownToLine,
        color: 'var(--palm)',
        title: transaction.payee,
        account: `Into ${accountName(transaction.accountId)}`,
      })
    case 'transfer':
      return withExtras({
        icon: ArrowLeftRight,
        color: 'var(--tide)',
        title: transaction.payee || 'Moved money',
        account: transaction.toAccountId
          ? `${accountName(transaction.accountId)} → ${accountName(transaction.toAccountId)}`
          : `Savings · ${accountName(transaction.accountId)}`,
      })
    case 'allocation':
      return withExtras({
        icon: PiggyBank,
        color: 'var(--lagoon-deep)',
        title:
          transaction.direction === 'toSpending'
            ? 'Taken out of Savings'
            : 'Put into Savings',
        account: transaction.autoSave ? 'Auto-save' : 'Savings',
      })
    case 'claim':
      return withExtras({
        icon: Scale,
        color: 'var(--coral)',
        title: transaction.claimAction
          ? claimFeedTitle(
              transaction.claimAction,
              transaction.payee,
              transaction.adjustPolarity,
            )
          : transaction.payee,
        account: transaction.accountId
          ? accountName(transaction.accountId)
          : 'No account',
      })
    default: {
      const category = resolveCategory(categories, transaction.categoryId)
      const title = transaction.payee || category?.name || 'Spending'
      return withExtras({
        icon: category?.icon ?? Tag,
        color: category?.color ?? 'var(--lagoon-deep)',
        title,
        detail: category && category.name !== title ? category.name : undefined,
        account: `From ${accountName(transaction.accountId)}`,
      })
    }
  }
}

const rowGridClassName =
  'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 @xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,13rem)_7.5rem] @xl:gap-x-4'

function TransactionRow({
  transaction,
  accounts,
  categories,
  onEdit,
  onDelete,
}: {
  transaction: Txn
  accounts: Account[]
  categories: Category[]
  onEdit: (transaction: Txn) => void
  onDelete: (transaction: Txn) => void
}) {
  const copy = rowCopy(transaction, accounts, categories)
  const Icon = copy.icon
  const canEdit = canMutateTransaction(transaction)
  const canDelete = canDeleteTransaction(transaction)
  const amountLabel = transactionAmountLabel(transaction)
  const content = (
    <>
      <span
        className="grid size-10 place-items-center rounded-xl"
        style={{
          background: `color-mix(in oklab, ${copy.color} 14%, transparent)`,
          color: copy.color,
        }}
      >
        <Icon className="size-[1.125rem]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.95rem] font-bold text-sea-ink">
          {copy.title}
        </span>
        <span className="block truncate text-[0.8rem] text-sea-ink-soft">
          <span className="@xl:hidden">
            {[copy.account, copy.detail].filter(Boolean).join(' · ')}
          </span>
          <span className="@max-xl:hidden">{copy.detail}</span>
        </span>
      </span>
      <span className="truncate text-sm text-sea-ink-soft @max-xl:hidden">
        {copy.account}
      </span>
      <span
        className={cn(
          'text-right text-[0.95rem] font-bold whitespace-nowrap tabular-nums',
          transaction.type === 'income'
            ? 'text-palm'
            : transaction.type === 'transfer' ||
                transaction.type === 'allocation'
              ? 'text-sea-ink-soft'
              : 'text-sea-ink',
        )}
      >
        {amountLabel}
      </span>
    </>
  )

  if (!canEdit && !canDelete) {
    return (
      <li className={cn(rowGridClassName, 'rounded-2xl px-2 py-2.5')}>
        {content}
      </li>
    )
  }

  return (
    <li>
      <Button
        type="button"
        variant="ghost"
        title={canEdit ? 'Change or delete' : 'Delete'}
        className={cn(
          rowGridClassName,
          'h-auto w-full rounded-2xl px-2 py-2.5 text-left font-normal whitespace-normal hover:bg-(--chip-bg)',
        )}
        onClick={() => (canEdit ? onEdit(transaction) : onDelete(transaction))}
      >
        {content}
      </Button>
    </li>
  )
}

export function TransactionsCard({
  transactions,
  accounts,
  categories,
  status,
  onLoadMore,
  onEdit,
  onDelete,
  className,
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
      variant="panel"
      className={cn('@container gap-0 p-4 sm:p-6', className)}
    >
      <h2 className="px-2 text-lg font-bold text-sea-ink">Recent activity</h2>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-lagoon-deep/10 text-lagoon-deep">
            <ReceiptText className="size-6" />
          </span>
          <p className="font-bold text-sea-ink">Nothing recorded yet</p>
          <p className="max-w-xs text-sm text-sea-ink-soft">
            Press Add whenever you spend or receive money. It shows up here.
          </p>
        </div>
      ) : (
        <>
          <div
            aria-hidden
            className={cn(
              rowGridClassName,
              'mt-4 border-b border-(--line) px-2 pb-2 text-[0.8rem] font-semibold text-sea-ink-soft @max-xl:hidden',
            )}
          >
            <span className="w-10" />
            <span>What</span>
            <span>Account</span>
            <span className="text-right">Amount</span>
          </div>
          {groups.map((group) => {
            const spent = group.txns
              .filter((transaction) => transaction.type === 'expense')
              .reduce((sum, transaction) => sum + transaction.amount, 0)
            return (
              <section key={group.day} className="mt-4 @xl:mt-5">
                <div className="flex items-baseline justify-between gap-3 px-2">
                  <h3 className="text-sm font-bold text-sea-ink">
                    {group.day}
                  </h3>
                  {spent > 0 && (
                    <span className="text-[0.8rem] text-sea-ink-soft tabular-nums">
                      {formatK(spent)} spent
                    </span>
                  )}
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {group.txns.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      accounts={accounts}
                      categories={categories}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
          {(status === 'CanLoadMore' || status === 'LoadingMore') && (
            <Button
              type="button"
              variant="outline"
              disabled={status === 'LoadingMore'}
              className="mt-4 w-full"
              onClick={onLoadMore}
            >
              {status === 'LoadingMore' ? 'Loading…' : 'Show more'}
            </Button>
          )}
          <p className="mt-4 px-2 text-[0.8rem] text-sea-ink-soft">
            Tap any line to change or delete it.
          </p>
        </>
      )}
    </Card>
  )
}
