import { convexQuery } from '@convex-dev/react-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { Archive, ArchiveRestore, Merge, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { claimFeedTitle } from '../../../shared/claim'
import { AppProviders } from '#/components/app/app-providers'
import { QuickAddSheet } from '#/components/app/quick-add'
import { TransactionDeleteDialog } from '#/components/app/transactions-card'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  canDeleteTransaction,
  canMutateTransaction,
  formatK,
  isSpendableAccount,
} from '#/lib/app-data'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'
import { mapDebt } from '#/lib/debts'
import { formatAmountInput, parseAmount } from '#/lib/onboarding-data'
import {
  mutationErrorMessage,
  useQuickAddSheet,
} from '#/lib/use-quick-add-sheet'

import type { Id } from '../../../convex/_generated/dataModel'
import type { Account, Txn } from '#/lib/app-data'
import type { Category } from '#/lib/categories'

const bootstrapQuery = convexQuery(api.misi.bootstrap, {})

const transactionDayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Africa/Blantyre',
})

export const Route = createFileRoute('/app/debts/$debtId')({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(bootstrapQuery)
    if (data === null || !data.settings?.onboardedAt) {
      throw redirect({ to: '/onboarding' })
    }
    try {
      await context.queryClient.ensureQueryData(
        convexQuery(api.misi.getDebt, {
          debtId: params.debtId as Id<'debts'>,
        }),
      )
    } catch {
      throw redirect({ to: '/app/debts' })
    }
  },
  component: DebtDetailPage,
})

function transactionDayLabel(occurredAt: number) {
  return transactionDayFormat.format(new Date(occurredAt))
}

function DebtDetailPage() {
  const { debtId } = Route.useParams()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(bootstrapQuery)
  const { data: detail } = useSuspenseQuery(
    convexQuery(api.misi.getDebt, { debtId: debtId as Id<'debts'> }),
  )
  const updateDebt = useMutation(api.misi.updateDebt)
  const archiveDebt = useMutation(api.misi.archiveDebt)
  const restoreDebt = useMutation(api.misi.restoreDebt)
  const mergeDebt = useMutation(api.misi.mergeDebt)
  const navigate = useNavigate()
  const [editorOpen, setEditorOpen] = useState(false)
  const [name, setName] = useState(detail.name)
  const [opening, setOpening] = useState(
    formatAmountInput(String(detail.openingBalance)),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Txn | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)

  const debt = mapDebt(detail)
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
        budgetGroup: category.budgetGroup,
        isSystem: category.isSystem,
        archived: category.archivedAt !== undefined,
      })),
    [data?.categories],
  )
  const debts = (data?.debts ?? []).map(mapDebt)
  const mergeTargets = debt.archived
    ? []
    : debts.filter(
        (item) =>
          item.id !== debt.id &&
          !item.archived &&
          item.direction === debt.direction,
      )
  const mergeTarget = mergeTargets.find((item) => item.id === mergeTargetId)
  const recents = data?.oneTapRecents ?? []
  const transactions = useMemo<Txn[]>(
    () =>
      detail.movements.map((transaction) => ({
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        payee: transaction.payee,
        accountId: transaction.accountId,
        debtId: transaction.debtId,
        claimAction: transaction.claimAction,
        adjustPolarity: transaction.adjustPolarity,
        walletId: transaction.walletId,
        note: transaction.note,
        occurredAt: transaction.occurredAt,
        day: transactionDayLabel(transaction.occurredAt),
      })),
    [detail.movements],
  )

  const expectedBalances = accounts.filter((account) =>
    isSpendableAccount(account),
  )
  const defaultExpenseAccountId =
    data?.settings?.defaultExpenseAccountId || expectedBalances[0]?.id || ''
  const {
    sheet,
    error: quickAddError,
    openSheet,
    closeSheet,
    saveTransaction,
    deleteTransaction,
    resolveAccountId,
    autoSaveRateForSource,
  } = useQuickAddSheet({
    accounts,
    incomePlans: data?.cycleIncomePlans ?? [],
    defaultSavingsRate: data?.settings?.defaultSavingsRate ?? 0,
    defaultExpenseAccountId,
  })

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bootstrapQuery.queryKey }),
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.misi.getDebt, {
          debtId: debtId as Id<'debts'>,
        }).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.misi.listDebts, {}).queryKey,
      }),
    ])
  }

  async function saveEdits() {
    if (saving) return
    setError(null)
    setSaving(true)
    try {
      await updateDebt({
        debtId: debt.id as Id<'debts'>,
        name,
        openingBalance: parseAmount(opening),
      })
      await invalidate()
      setEditorOpen(false)
      toast.success('Debt updated')
    } catch (caught) {
      setError(mutationErrorMessage(caught, 'Unable to update debt'))
    } finally {
      setSaving(false)
    }
  }

  async function archive() {
    try {
      await archiveDebt({ debtId: debt.id as Id<'debts'> })
      await invalidate()
      toast.success('Debt archived')
    } catch (caught) {
      toast.error(mutationErrorMessage(caught, 'Unable to archive debt'))
    }
  }

  async function restore() {
    try {
      await restoreDebt({ debtId: debt.id as Id<'debts'> })
      await invalidate()
      toast.success('Debt restored')
    } catch (caught) {
      toast.error(mutationErrorMessage(caught, 'Unable to restore debt'))
    }
  }

  async function confirmMerge() {
    if (!mergeTarget || merging) return
    setMergeError(null)
    setMerging(true)
    try {
      await mergeDebt({
        sourceId: debt.id as Id<'debts'>,
        targetId: mergeTarget.id as Id<'debts'>,
      })
      // This debt no longer exists, so skip refetching its detail query.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bootstrapQuery.queryKey }),
        queryClient.invalidateQueries({
          queryKey: convexQuery(api.misi.listDebts, {}).queryKey,
        }),
      ])
      setMergeOpen(false)
      toast.success(`Merged into ${mergeTarget.name}`)
      void navigate({
        to: '/app/debts/$debtId',
        params: { debtId: mergeTarget.id },
      })
    } catch (caught) {
      setMergeError(mutationErrorMessage(caught, 'Unable to merge debts'))
    } finally {
      setMerging(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    try {
      const deleted = await deleteTransaction(pendingDelete.id)
      if (deleted) {
        await invalidate()
        setPendingDelete(null)
        toast.success('Transaction deleted')
      }
    } finally {
      setDeleting(false)
    }
  }

  if (!data?.settings) {
    return null
  }

  return (
    <AppProviders>
      <div className="min-h-screen">
        <main className="page-wrap py-6 sm:py-8">
          <p className="island-kicker">
            <Link to="/app/debts" className="text-lagoon-deep no-underline">
              Debts
            </Link>
            {' · '}
            {debt.direction === 'you_owe' ? 'You owe' : 'Owed to you'}
            {debt.archived ? ' · Archived' : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
                {debt.name}
              </h1>
              <p className="mt-1.5 text-[0.95rem] text-sea-ink-soft">
                Remaining{' '}
                <span className="font-mono font-semibold text-sea-ink tabular-nums">
                  {formatK(debt.remaining)}
                </span>
                {' · '}
                Opening{' '}
                <span className="font-mono tabular-nums">
                  {formatK(debt.openingBalance)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setName(debt.name)
                  setOpening(formatAmountInput(String(debt.openingBalance)))
                  setError(null)
                  setEditorOpen(true)
                }}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
              {debt.archived ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void restore()}
                >
                  <ArchiveRestore className="size-4" />
                  Restore
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={debt.remaining !== 0}
                  title={
                    debt.remaining !== 0
                      ? 'Settle or adjust the remaining balance to zero before archiving'
                      : undefined
                  }
                  onClick={() => void archive()}
                >
                  <Archive className="size-4" />
                  Archive
                </Button>
              )}
              {mergeTargets.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setMergeTargetId(
                      mergeTargets.length === 1 ? mergeTargets[0].id : '',
                    )
                    setMergeError(null)
                    setMergeOpen(true)
                  }}
                >
                  <Merge className="size-4" />
                  Merge into…
                </Button>
              )}
              {!debt.archived && (
                <Button
                  type="button"
                  onClick={() =>
                    openSheet({
                      mode: 'claim',
                      debtId: debt.id,
                      claimAction:
                        debt.direction === 'you_owe' ? 'repay' : 'collect',
                    })
                  }
                >
                  <Plus className="size-4" />
                  Log movement
                </Button>
              )}
            </div>
          </div>

          <Card variant="island" className="mt-6 gap-0 rounded-3xl p-3 sm:p-4">
            {transactions.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-sea-ink-soft">
                No movements yet. Opening {formatK(debt.openingBalance)} is the
                starting remaining.
              </p>
            ) : (
              transactions.map((transaction, index) => {
                const account = transaction.accountId
                  ? accounts.find((item) => item.id === transaction.accountId)
                  : undefined
                const title = transaction.claimAction
                  ? claimFeedTitle(
                      transaction.claimAction,
                      debt.name,
                      transaction.adjustPolarity,
                    )
                  : transaction.payee
                return (
                  <div
                    key={transaction.id}
                    className={`flex items-center gap-2 px-2 py-3 ${
                      index > 0 ? 'border-t border-(--line)' : ''
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!canMutateTransaction(transaction)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left disabled:opacity-70"
                      onClick={() => {
                        if (!canMutateTransaction(transaction)) return
                        openSheet({
                          transactionId: transaction.id,
                          mode: 'claim',
                          amount: transaction.amount,
                          accountId: transaction.accountId,
                          debtId: transaction.debtId,
                          claimAction: transaction.claimAction,
                          adjustPolarity: transaction.adjustPolarity,
                          note: transaction.note,
                          occurredAt: transaction.occurredAt,
                          fromSavings: transaction.walletId === 'savings',
                        })
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-sea-ink">
                          {title}
                        </span>
                        <span className="text-xs text-sea-ink-soft">
                          {transaction.day}
                          {account ? ` · ${account.name}` : ' · no account'}
                        </span>
                      </span>
                      <span className="font-mono shrink-0 text-sm font-semibold tabular-nums">
                        {formatK(transaction.amount)}
                      </span>
                    </button>
                    {canDeleteTransaction(transaction) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-10 sm:h-8"
                        onClick={() => setPendingDelete(transaction)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )
              })
            )}
          </Card>
        </main>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent
          sheet
          className="rounded-3xl border-(--line) bg-(--surface-strong)"
        >
          <DialogHeader>
            <DialogTitle>Edit {debt.name}</DialogTitle>
            <DialogDescription>
              Direction cannot change. Opening recomputes remaining.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-debt-name">Name</Label>
              <Input
                id="edit-debt-name"
                className="mt-2"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-debt-opening">Opening balance</Label>
              <Input
                id="edit-debt-opening"
                className="mt-2"
                inputMode="decimal"
                value={opening}
                onChange={(event) =>
                  setOpening(formatAmountInput(event.target.value))
                }
              />
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
              >
                {error}
              </p>
            )}
          </div>
          <DialogFooter sticky>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void saveEdits()}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={mergeOpen}
        onOpenChange={(open) => {
          if (!open && !merging) setMergeOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge {debt.name} into…</AlertDialogTitle>
            <AlertDialogDescription>
              {mergeTarget
                ? `${debt.name}'s movements and ${formatK(debt.openingBalance)} opening balance will move to ${mergeTarget.name}, bringing its remaining to ${formatK(mergeTarget.remaining + debt.remaining)}. ${debt.name} is then deleted.`
                : `Pick another ${debt.direction === 'you_owe' ? 'you owe' : 'owed to you'} debt. ${debt.name}'s movements and balance will move there, and ${debt.name} is then deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Label htmlFor="merge-debt-target" className="mb-2">
              Merge into
            </Label>
            <Select
              value={mergeTargetId}
              disabled={merging}
              onValueChange={setMergeTargetId}
            >
              <SelectTrigger id="merge-debt-target" className="w-full">
                <SelectValue placeholder="Choose a debt" />
              </SelectTrigger>
              <SelectContent>
                {mergeTargets.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} · {formatK(item.remaining)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {mergeError && (
            <p
              role="alert"
              className="rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
            >
              {mergeError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merging}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              disabled={!mergeTarget || merging}
              onClick={() => void confirmMerge()}
            >
              {merging ? 'Merging…' : 'Merge debts'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {sheet.open && (
        <QuickAddSheet
          initial={sheet.initial}
          categories={categories}
          accounts={accounts}
          debts={debts}
          incomeSources={data.incomeSources.map((source) => ({
            id: source._id,
            name: source.name,
            savingsRate: source.savingsRate,
            isAnchor: source.isAnchor,
          }))}
          recents={recents}
          defaultExpenseAccountId={defaultExpenseAccountId}
          defaultTransferFromAccountId={defaultExpenseAccountId}
          defaultTransferToAccountId={defaultExpenseAccountId}
          usdRate={data.settings.usdRate}
          reconcileNote="Reconcile"
          autoSaveRateForSource={autoSaveRateForSource}
          resolveAccountId={resolveAccountId}
          error={quickAddError}
          onClose={closeSheet}
          onSave={async (payload) => {
            await saveTransaction(payload)
            await invalidate()
          }}
          onDelete={
            sheet.initial.transactionId
              ? () => {
                  const transaction = transactions.find(
                    (item) => item.id === sheet.initial.transactionId,
                  )
                  if (transaction) setPendingDelete(transaction)
                }
              : undefined
          }
        />
      )}
      <TransactionDeleteDialog
        transaction={pendingDelete}
        error={pendingDelete ? quickAddError : null}
        busy={deleting}
        onCancel={() => {
          if (deleting) return
          setPendingDelete(null)
        }}
        onConfirm={() => void confirmDelete()}
      />
    </AppProviders>
  )
}
