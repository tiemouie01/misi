import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { QuickAddSheet } from '#/components/app/quick-add'
import { ReconcileCard } from '#/components/app/reconcile-card'
import { mapAccount, resolveQuickAddDefaults, USD_RATE } from '#/lib/app-data'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'
import { errorMessage } from '#/lib/error-message'
import { useQuickAddSheet } from '#/lib/use-quick-add-sheet'

import type { Id } from '../../../convex/_generated/dataModel'
import type { Account, ReconcileBalance } from '#/lib/app-data'
import type { Category } from '#/lib/categories'

const bootstrapQuery = convexQuery(api.misi.bootstrap, {})

const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Blantyre',
})

function shortDate(timestamp: number) {
  return shortDateFormat.format(new Date(timestamp))
}

export function ReconcileTask() {
  const [now] = useState(() => Date.now())
  const { data } = useSuspenseQuery(bootstrapQuery)
  const absorbAdjustmentMutation = useMutation(api.misi.absorbAdjustment)
  const logInvestmentReturnMutation = useMutation(api.misi.logInvestmentReturn)
  const [actualOverrides, setActualOverrides] = useState<
    Record<string, { expected: number; actual: number } | undefined>
  >({})

  const accounts = useMemo<Account[]>(
    () => (data?.accounts ?? []).map(mapAccount),
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
        budgetGroup: category.budgetGroup,
        isSystem: category.isSystem,
        archived: category.archivedAt !== undefined,
      })),
    [data?.categories],
  )

  // Investment accounts are checked too, so a return can be logged as income.
  const expectedBalances = useMemo(
    () =>
      accounts
        .filter((account) => !account.archived)
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

  const {
    expense: defaultExpenseAccountId,
    transferFrom: defaultTransferFromAccountId,
    transferTo: defaultTransferToAccountId,
  } = resolveQuickAddDefaults(accounts, data?.settings)

  const {
    sheet,
    error: quickAddError,
    openSheet,
    closeSheet,
    saveTransaction,
    resolveAccountId,
    autoSaveRateForSource,
  } = useQuickAddSheet({
    accounts,
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
        errorMessage(error, 'Unable to absorb balance adjustment. Try again.'),
      )
      console.error('Unable to absorb balance adjustment', error)
    }
  }

  async function logInvestmentReturn(accountId: string) {
    const balance = reconcile.find((item) => item.accountId === accountId)
    if (!balance) return
    try {
      await logInvestmentReturnMutation({
        accountId: accountId as Id<'accounts'>,
        actual: balance.actual,
        note: reconcileNote,
      })
      toast.success('Investment return logged as income')
    } catch (error) {
      toast.error(
        errorMessage(error, 'Unable to log the investment return. Try again.'),
      )
      console.error('Unable to log investment return', error)
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
        embedded
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
        onLogReturn={(accountId) => void logInvestmentReturn(accountId)}
        onLogMissing={openSheet}
        animationDelay="60ms"
        usdRate={data?.settings?.usdRate ?? USD_RATE}
      />
      {sheet.open && (
        <QuickAddSheet
          initial={sheet.initial}
          categories={categories}
          accounts={accounts}
          incomeSources={(data?.incomeSources ?? []).map((source) => ({
            id: source._id,
            name: source.name,
            savingsRate: source.savingsRate,
            isAnchor: source.isAnchor,
          }))}
          recents={data?.oneTapRecents ?? []}
          defaultExpenseAccountId={defaultExpenseAccountId}
          defaultTransferFromAccountId={defaultTransferFromAccountId}
          defaultTransferToAccountId={defaultTransferToAccountId}
          usdRate={data?.settings?.usdRate ?? USD_RATE}
          reconcileNote={reconcileNote}
          autoSaveRateForSource={autoSaveRateForSource}
          resolveAccountId={resolveAccountId}
          error={quickAddError}
          onClose={closeSheet}
          onSave={(payload) => void saveTransaction(payload)}
        />
      )}
    </>
  )
}
