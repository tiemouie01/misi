import { convexQuery } from '@convex-dev/react-query'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { ReceiptText } from 'lucide-react'
import { useMemo } from 'react'

import { api } from '../../../convex/_generated/api'
import { useQuickAdd } from '#/components/app/quick-add-provider'
import { TransactionDayGroups } from '#/components/app/transactions-card'
import { mapAccount } from '#/lib/app-data'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'
import { editInitialFromTxn, toTxn } from '#/lib/transactions'

import type { Id } from '../../../convex/_generated/dataModel'
import type { BudgetCategoryTransactionsSlot } from './types'
import type { Txn } from '#/lib/app-data'
import type { Category } from '#/lib/categories'

/** The spending logged under one category in a cycle, newest first. Tapping a
 * line closes the sheet and opens the usual edit flow. */
export function CategoryTransactions({
  cycleId,
  categoryId,
  close,
  now,
}: BudgetCategoryTransactionsSlot & {
  /** Anchors the Today / Yesterday day labels. */
  now: number
}) {
  const { openSheet, requestDelete } = useQuickAdd()
  const { data: bootstrap } = useSuspenseQuery(
    convexQuery(api.misi.bootstrap, {}),
  )
  const { data } = useQuery(
    convexQuery(api.misi.categoryTransactions, {
      cycleId: cycleId as Id<'cycles'>,
      categoryId,
    }),
  )

  const accounts = useMemo(
    () => (bootstrap?.accounts ?? []).map(mapAccount),
    [bootstrap?.accounts],
  )
  const categories = useMemo<Category[]>(
    () =>
      (bootstrap?.categories ?? []).map((category) => ({
        id: category._id,
        key: category.key,
        name: category.name,
        icon: resolveCategoryIcon(category.icon),
        color: resolveCategoryColor(category.color),
        budgetGroup: category.budgetGroup,
        isSystem: category.isSystem,
        archived: category.archivedAt !== undefined,
      })),
    [bootstrap?.categories],
  )
  const transactions = useMemo(
    () => data?.map((transaction) => toTxn(transaction, now)),
    [data, now],
  )

  if (!transactions) {
    return (
      <p className="px-2 py-10 text-center text-sm text-sea-ink-soft">
        Loading transactions…
      </p>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-lagoon-deep/10 text-lagoon-deep">
          <ReceiptText className="size-6" aria-hidden="true" />
        </span>
        <p className="font-bold text-sea-ink">Nothing spent here yet</p>
        <p className="max-w-xs text-sm text-sea-ink-soft">
          Spending you log under this category in this cycle shows up here.
        </p>
      </div>
    )
  }

  function edit(transaction: Txn) {
    close()
    openSheet(editInitialFromTxn(transaction), transaction)
  }

  function remove(transaction: Txn) {
    close()
    requestDelete(transaction)
  }

  return (
    <>
      <TransactionDayGroups
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        onEdit={edit}
        onDelete={remove}
      />
      <p className="mt-4 px-2 text-[0.8rem] text-sea-ink-soft">
        Tap a line to change or delete it.
      </p>
    </>
  )
}
