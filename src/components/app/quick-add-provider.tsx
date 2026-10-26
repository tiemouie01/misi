import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createContext, use, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { QuickAddSheet } from '#/components/app/quick-add'
import { TransactionDeleteDialog } from '#/components/app/transactions-card'
import {
  canDeleteTransaction,
  mapAccount,
  resolveQuickAddDefaults,
} from '#/lib/app-data'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'
import { mapDebt } from '#/lib/debts'
import { useQuickAddSheet } from '#/lib/use-quick-add-sheet'

import type { FunctionReturnType } from 'convex/server'
import type { ReactNode } from 'react'
import type { Account, QuickAddInitial, Txn } from '#/lib/app-data'
import type { Category } from '#/lib/categories'

type BootstrapData = NonNullable<FunctionReturnType<typeof api.misi.bootstrap>>

interface QuickAddContextValue {
  /** Opens the quick-add sheet. Pass the transaction being edited so the
   * sheet can offer to delete it. */
  openSheet: (initial: QuickAddInitial, transaction?: Txn) => void
  requestDelete: (transaction: Txn) => void
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null)

export function useQuickAdd() {
  const value = use(QuickAddContext)
  if (!value) throw new Error('useQuickAdd must be used inside /app')
  return value
}

/** For the app shell, which renders before onboarding has finished and so
 * before quick add is available. */
export function useOptionalQuickAdd() {
  return use(QuickAddContext)
}

/** True when a key press is meant for a text field or an open dialog rather
 * than a page-wide shortcut. */
function isTypingOrInDialog(event: KeyboardEvent) {
  const target = event.target
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest('input, textarea, select, [role="dialog"]'))
  ) {
    return true
  }
  return (
    document.querySelector('[role="dialog"], [role="alertdialog"]') !== null
  )
}

const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Blantyre',
})

/** Owns the quick-add sheet, its N shortcut and delete confirmation for every
 * /app page. */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const { data } = useSuspenseQuery(convexQuery(api.misi.bootstrap, {}))
  if (!data?.settings) return children
  return (
    <ReadyQuickAddProvider data={data} settings={data.settings}>
      {children}
    </ReadyQuickAddProvider>
  )
}

function ReadyQuickAddProvider({
  data,
  settings,
  children,
}: {
  data: BootstrapData
  settings: NonNullable<BootstrapData['settings']>
  children: ReactNode
}) {
  const [editing, setEditing] = useState<Txn | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Txn | null>(null)
  const [deleting, setDeleting] = useState(false)

  const accounts = useMemo<Account[]>(
    () => data.accounts.map(mapAccount),
    [data.accounts],
  )

  const categories = useMemo<Category[]>(
    () =>
      data.categories.map((category) => ({
        id: category._id,
        key: category.key,
        name: category.name,
        icon: resolveCategoryIcon(category.icon),
        color: resolveCategoryColor(category.color),
        budgetGroup: category.budgetGroup,
        isSystem: category.isSystem,
        archived: category.archivedAt !== undefined,
      })),
    [data.categories],
  )

  const {
    expense: defaultExpenseAccountId,
    transferFrom: defaultTransferFromAccountId,
    transferTo: defaultTransferToAccountId,
  } = resolveQuickAddDefaults(accounts, settings)

  const {
    sheet,
    error,
    openSheet,
    closeSheet,
    saveTransaction,
    deleteTransaction,
    resolveAccountId,
    autoSaveRateForSource,
  } = useQuickAddSheet({
    accounts,
    incomePlans: data.cycleIncomePlans,
    defaultSavingsRate: settings.defaultSavingsRate,
    defaultExpenseAccountId,
  })

  function open(initial: QuickAddInitial, transaction?: Txn) {
    setEditing(transaction ?? null)
    openSheet(initial)
  }

  useEffect(() => {
    if (sheet.open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'n' && event.key !== 'N') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingOrInDialog(event)) return
      event.preventDefault()
      setEditing(null)
      openSheet({ mode: 'expense' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sheet.open, openSheet])

  function requestDelete(transaction: Txn) {
    if (!canDeleteTransaction(transaction)) return
    closeSheet()
    setPendingDelete(transaction)
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    try {
      const deleted = await deleteTransaction(pendingDelete.id)
      if (deleted) {
        setPendingDelete(null)
        toast.success('Transaction deleted')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <QuickAddContext value={{ openSheet: open, requestDelete }}>
      {children}
      {sheet.open && (
        <QuickAddSheet
          initial={sheet.initial}
          categories={categories}
          accounts={accounts}
          debts={data.debts.map(mapDebt)}
          incomeSources={data.incomeSources.map((source) => ({
            id: source._id,
            name: source.name,
            savingsRate: source.savingsRate,
            isAnchor: source.isAnchor,
          }))}
          recents={data.oneTapRecents}
          categoryUsage={data.categoryUsage}
          defaultExpenseAccountId={defaultExpenseAccountId}
          defaultTransferFromAccountId={defaultTransferFromAccountId}
          defaultTransferToAccountId={defaultTransferToAccountId}
          usdRate={settings.usdRate}
          reconcileNote={`Reconcile ${shortDateFormat.format(new Date())}`}
          autoSaveRateForSource={autoSaveRateForSource}
          resolveAccountId={resolveAccountId}
          error={error}
          onClose={closeSheet}
          onSave={(payload) => void saveTransaction(payload)}
          onDelete={
            editing && sheet.initial.transactionId === editing.id
              ? () => requestDelete(editing)
              : undefined
          }
        />
      )}
      <TransactionDeleteDialog
        transaction={pendingDelete}
        error={pendingDelete ? error : null}
        busy={deleting}
        onCancel={() => {
          if (deleting) return
          closeSheet()
          setPendingDelete(null)
        }}
        onConfirm={() => void confirmDelete()}
      />
    </QuickAddContext>
  )
}
