import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { QuickAddSheet } from '#/components/app/quick-add'
import { ReconcileCard } from '#/components/app/reconcile-card'
import { isSpendableAccount, USD_RATE } from '#/lib/app-data'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'
import {
  mutationErrorMessage,
  useQuickAddSheet,
} from '#/lib/use-quick-add-sheet'

import type { Id } from '../../../convex/_generated/dataModel'
import type { Account, ReconcileBalance } from '#/lib/app-data'
import type { Category } from '#/lib/categories'

const bootstrapQuery = convexQuery(api.misi.bootstrap, {})

function shortDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Blantyre',
  }).format(new Date(timestamp))
}

export function ReconcileTask() {
  const [now] = useState(() => Date.now())
  const { data } = useSuspenseQuery(bootstrapQuery)
  const absorbAdjustmentMutation = useMutation(api.misi.absorbAdjustment)
  const [actualOverrides, setActualOverrides] = useState<
    Record<string, { expected: number; actual: number } | undefined>
  >({})

  const accounts = useMemo<Account[]>(
    () =>
      (data?.accounts ?? []).map((account) => ({
        id: account._id,
        name: account.name,
        kind: account.kind,
        currency: account.currency,
        balance: account.balance,
        includeInSpendable: account.includeInSpendable,
      })),
    [data?.accounts],
  )

  const categories = useMemo<Category[]>(
    () =>
      (data?.categories ?? []).map((category) => ({
        id: category._id,
        key: category.key,
        name: category.name,
        icon: resolveCategoryIcon(category.icon),
        color: resolveCategoryColor(category.color),
        isSystem: category.isSystem,
        archived: category.archivedAt !== undefined,
      })),
    [data?.categories],
  )

  const expectedBalances = useMemo(
    () =>
      accounts
        .filter((account) => isSpendableAccount(account))
        .map((account) => ({
          accountId: account.id,
          expected: account.balance,
        })),
    [accounts],
  )

  const reconcile: ReconcileBalance[] = expectedBalances.map((balance) => {
    const override = actualOverrides[balance.accountId]
    return {
      ...balance,
      actual:
        override?.expected === balance.expected
          ? override.actual
          : balance.expected,
    }
  })
  const reconcileClosed = reconcile.every(
    (balance) => balance.expected === balance.actual,
  )

  const defaultExpenseAccountId =
    data?.settings?.defaultExpenseAccountId ||
    expectedBalances[0]?.accountId ||
    ''
  const defaultTransferFromAccountId =
    data?.settings?.defaultTransferFromAccountId ||
    expectedBalances[0]?.accountId ||
    ''
  const defaultTransferToAccountId =
    data?.settings?.defaultTransferToAccountId ??
    expectedBalances.find(
      (balance) => balance.accountId !== defaultTransferFromAccountId,
    )?.accountId ??
    defaultTransferFromAccountId

  const {
    sheet,
    error: quickAddError,
    openSheet,
    closeSheet,
    saveTransaction,
    resolveAccountId,
    autoSaveRateForPayee,
  } = useQuickAddSheet({
    accounts,
    incomeSources: (data?.incomeSources ?? []).map((source) => ({
      id: source._id,
      name: source.name,
    })),
    incomePlans: data?.cycleIncomePlans ?? [],
    defaultSavingsRate: data?.settings?.defaultSavingsRate ?? 0.2,
    defaultExpenseAccountId,
  })

  const reconcileNote = `Reconcile ${shortDate(now)}`
  const lastClosed = data?.currentCycle
    ? `opened ${shortDate(data.currentCycle.startsAt)}`
    : ''

  async function absorbAdjustment(accountId: string) {
    const balance = reconcile.find((item) => item.accountId === accountId)
    if (!balance) return
    try {
      await absorbAdjustmentMutation({
        accountId: accountId as Id<'accounts'>,
        actual: balance.actual,
        note: reconcileNote,
      })
      toast.success('Balance adjusted')
    } catch (error) {
      toast.error(
        mutationErrorMessage(
          error,
          'Unable to absorb balance adjustment. Try again.',
        ),
      )
      console.error('Unable to absorb balance adjustment', error)
    }
  }

  return (
    <>
      <ReconcileCard
        accounts={accounts}
        categories={categories}
        balances={reconcile}
        closed={reconcileClosed}
        lastClosed={lastClosed}
        startExpanded
        onActualChange={(accountId, actual) =>
          setActualOverrides((current) => ({
            ...current,
            [accountId]: {
              expected:
                expectedBalances.find(
                  (balance) => balance.accountId === accountId,
                )?.expected ?? actual,
              actual,
            },
          }))
        }
        onAbsorb={(accountId) => void absorbAdjustment(accountId)}
        onLogMissing={openSheet}
        animationDelay="60ms"
      />
      {sheet.open && (
        <QuickAddSheet
          initial={sheet.initial}
          categories={categories}
          accounts={accounts}
          defaultExpenseAccountId={defaultExpenseAccountId}
          defaultTransferFromAccountId={defaultTransferFromAccountId}
          defaultTransferToAccountId={defaultTransferToAccountId}
          usdRate={data?.settings?.usdRate ?? USD_RATE}
          reconcileNote={reconcileNote}
          autoSaveRateForPayee={autoSaveRateForPayee}
          resolveAccountId={resolveAccountId}
          error={quickAddError}
          onClose={closeSheet}
          onSave={(payload) => void saveTransaction(payload)}
        />
      )}
    </>
  )
}
