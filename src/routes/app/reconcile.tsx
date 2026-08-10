import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useMemo, useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { AppHeader } from '#/components/app/app-header'
import { AppProviders } from '#/components/app/app-providers'
import { QuickAddSheet } from '#/components/app/quick-add'
import { ReconcileCard } from '#/components/app/reconcile-card'
import { Button } from '#/components/ui/button'
import { isSpendableAccount } from '#/lib/app-data'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'
import {
  mutationErrorMessage,
  useQuickAddSheet,
} from '#/lib/use-quick-add-sheet'

import type { Id } from '../../../convex/_generated/dataModel'
import type { Account, ReconcileBalance } from '#/lib/app-data'
import type { Category } from '#/lib/categories'

const bootstrapQuery = convexQuery(api.misi.bootstrap, {})

export const Route = createFileRoute('/app/reconcile')({
  loader: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData(bootstrapQuery)
    if (data === null || !data.settings?.onboardedAt) {
      throw redirect({ to: '/onboarding' })
    }
    return { now: Date.now() }
  },
  component: ReconcileRoute,
})

function shortDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Blantyre',
  }).format(new Date(timestamp))
}

function ReconcileRoute() {
  const { now } = Route.useLoaderData()
  const { data } = useSuspenseQuery(bootstrapQuery)
  const absorbAdjustmentMutation = useMutation(api.misi.absorbAdjustment)
  const [actionError, setActionError] = useState<string | null>(null)
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
    setActionError(null)
    try {
      await absorbAdjustmentMutation({
        accountId: accountId as Id<'accounts'>,
        actual: balance.actual,
        note: reconcileNote,
      })
    } catch (error) {
      setActionError(
        mutationErrorMessage(
          error,
          'Unable to absorb balance adjustment. Try again.',
        ),
      )
      console.error('Unable to absorb balance adjustment', error)
    }
  }

  return (
    <AppProviders>
      <div className="min-h-screen">
        <AppHeader badge="Reconcile" />
        <main className="page-wrap py-6 sm:py-8">
          {actionError && (
            <div
              role="alert"
              className="mx-auto mb-5 flex max-w-2xl items-start justify-between gap-3 rounded-2xl border border-coral/25 bg-coral/8 px-4 py-3"
            >
              <p className="text-sm font-semibold text-coral-deep">
                {actionError}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-coral-deep"
                onClick={() => setActionError(null)}
              >
                Dismiss
              </Button>
            </div>
          )}
          <div className="mx-auto max-w-2xl">
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
          </div>
        </main>
        {sheet.open && (
          <QuickAddSheet
            initial={sheet.initial}
            categories={categories}
            accounts={accounts}
            defaultExpenseAccountId={defaultExpenseAccountId}
            defaultTransferFromAccountId={defaultTransferFromAccountId}
            defaultTransferToAccountId={defaultTransferToAccountId}
            reconcileNote={reconcileNote}
            autoSaveRateForPayee={autoSaveRateForPayee}
            resolveAccountId={resolveAccountId}
            error={quickAddError}
            onClose={closeSheet}
            onSave={(payload) => void saveTransaction(payload)}
          />
        )}
      </div>
    </AppProviders>
  )
}
