import { convexQuery } from '@convex-dev/react-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import {
  Archive,
  ArchiveRestore,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  CircleCheck,
  Merge,
  Pencil,
  Plus,
  ReceiptText,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { claimActionLabel, claimRemainingDelta } from '../../../shared/claim'
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
import { Progress } from '#/components/ui/progress'
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
  mapAccount,
  resolveQuickAddDefaults,
} from '#/lib/app-data'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'
import { mapDebt } from '#/lib/debts'
import { formatAmountInput, parseAmount } from '#/lib/onboarding-data'
import { errorMessage } from '#/lib/error-message'
import { useQuickAddSheet } from '#/lib/use-quick-add-sheet'
import { cn } from '#/lib/utils'

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

/** One option in the "Manage" card: icon, plain label and a short hint. */
function ManageAction({
  icon: Icon,
  label,
  hint,
  disabled,
  title,
  onClick,
}: {
  icon: typeof Pencil
  label: string
  hint: string
  disabled?: boolean
  title?: string
  onClick: () => void
}) {
  return (
    <li title={title}>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        className="h-auto w-full justify-start gap-3 rounded-2xl px-2 py-2.5 text-left font-normal whitespace-normal hover:bg-(--chip-bg)"
        onClick={onClick}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lagoon-deep/10 text-lagoon-deep">
          <Icon className="size-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-sea-ink">{label}</span>
          <span className="block text-[0.8rem] text-sea-ink-soft">{hint}</span>
        </span>
      </Button>
    </li>
  )
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

  const defaultExpenseAccountId = resolveQuickAddDefaults(
    accounts,
    data?.settings,
  ).expense
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
      setError(errorMessage(caught, 'Unable to update debt'))
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
      toast.error(errorMessage(caught, 'Unable to archive debt'))
    }
  }

  async function restore() {
    try {
      await restoreDebt({ debtId: debt.id as Id<'debts'> })
      await invalidate()
      toast.success('Debt restored')
    } catch (caught) {
      toast.error(errorMessage(caught, 'Unable to restore debt'))
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
      setMergeError(errorMessage(caught, 'Unable to merge debts'))
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

  const youOwe = debt.direction === 'you_owe'
  // How far the balance has come down from where it started.
  const paidSoFar = Math.min(
    debt.openingBalance,
    Math.max(0, debt.openingBalance - debt.remaining),
  )

  return (
    <AppProviders>
      <main className="page-wrap py-6 sm:py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <Link
              to="/app/debts"
              className="inline-flex items-center gap-1 text-sm font-semibold text-sea-ink-soft! no-underline hover:text-sea-ink!"
            >
              <ChevronLeft className="size-4" />
              All debts
            </Link>
            <h1 className="font-display mt-1 text-[1.75rem] font-bold tracking-tight break-words text-sea-ink sm:text-4xl">
              {debt.name}
            </h1>
          </div>
          {!debt.archived && (
            <Button
              type="button"
              size="lg"
              onClick={() =>
                openSheet({
                  mode: 'claim',
                  debtId: debt.id,
                  claimAction: youOwe ? 'repay' : 'collect',
                })
              }
            >
              <Plus className="size-5" strokeWidth={2.6} />
              Add a payment
            </Button>
          )}
        </header>

        {/* The amount left sits straight on the teal ground so it reads
            first, like the home page's main number. */}
        <section className="mt-5 flex max-w-2xl flex-col gap-3 py-1 sm:mt-6">
          <h2 className="text-[0.95rem] font-semibold text-sea-ink-soft">
            {youOwe ? 'You still owe' : 'Still owed to you'}
          </h2>
          <p className="text-[2.75rem] leading-none font-extrabold tracking-tight tabular-nums sm:text-6xl">
            {formatK(debt.remaining)}
          </p>
          {debt.openingBalance > 0 && (
            <Progress
              value={paidSoFar}
              max={debt.openingBalance}
              aria-label={
                youOwe ? 'Share paid back so far' : 'Share paid to you so far'
              }
              className="h-2.5 bg-white/16 dark:bg-lagoon-deep/12 [&_[data-slot=progress-indicator]]:bg-none [&_[data-slot=progress-indicator]]:bg-lagoon"
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p className="text-sm text-sea-ink-soft tabular-nums">
              {debt.openingBalance > 0
                ? `${formatK(paidSoFar)} ${youOwe ? 'paid back' : 'paid to you'} · `
                : ''}
              Started at {formatK(debt.openingBalance)}
            </p>
            {debt.archived ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[0.8rem] font-bold text-sea-ink dark:bg-lagoon-deep/12">
                <Archive className="size-3.5" strokeWidth={2.4} />
                Archived
              </span>
            ) : (
              debt.remaining === 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-lagoon/22 px-2.5 py-1 text-[0.8rem] font-bold text-sea-ink">
                  <CircleCheck
                    className="size-3.5 text-lagoon"
                    strokeWidth={2.4}
                  />
                  Paid off
                </span>
              )
            )}
          </div>
        </section>

        {/* History takes the wide left column from `xl`; the manage card sits
            on the right. Below `xl` history comes first. */}
        <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start">
          <Card variant="panel" className="gap-0 p-4 sm:p-6">
            <h2 className="px-2 text-lg font-bold text-sea-ink">History</h2>
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-lagoon-deep/10 text-lagoon-deep">
                  <ReceiptText className="size-6" />
                </span>
                <p className="font-bold text-sea-ink">Nothing recorded yet</p>
                <p className="max-w-xs text-sm text-sea-ink-soft">
                  It started at {formatK(debt.openingBalance)}. Payments you add
                  will show here.
                </p>
              </div>
            ) : (
              <ul className="mt-2 space-y-0.5">
                {transactions.map((transaction) => {
                  const account = transaction.accountId
                    ? accounts.find((item) => item.id === transaction.accountId)
                    : undefined
                  const title = transaction.claimAction
                    ? claimActionLabel(
                        transaction.claimAction,
                        transaction.adjustPolarity,
                      )
                    : transaction.payee
                  const delta = transaction.claimAction
                    ? claimRemainingDelta({
                        action: transaction.claimAction,
                        amount: transaction.amount,
                        adjustPolarity: transaction.adjustPolarity,
                      })
                    : 0
                  const Icon = delta < 0 ? ArrowDownRight : ArrowUpRight
                  const content = (
                    <>
                      <span
                        className={cn(
                          'grid size-10 shrink-0 place-items-center rounded-xl',
                          delta < 0
                            ? 'bg-palm/12 text-palm'
                            : 'bg-coral/12 text-coral-deep',
                        )}
                      >
                        <Icon className="size-[1.125rem]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.95rem] font-bold text-sea-ink">
                          {title}
                        </span>
                        <span className="block truncate text-[0.8rem] text-sea-ink-soft">
                          {transaction.day}
                          {account ? ` · ${account.name}` : ' · no account'}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-[0.95rem] font-bold whitespace-nowrap text-sea-ink tabular-nums">
                        {formatK(transaction.amount)}
                      </span>
                    </>
                  )
                  return (
                    <li
                      key={transaction.id}
                      className="flex items-center gap-1"
                    >
                      {canMutateTransaction(transaction) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          title="Change"
                          className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-2xl px-2 py-2.5 text-left font-normal whitespace-normal hover:bg-(--chip-bg)"
                          onClick={() =>
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
                          }
                        >
                          {content}
                        </Button>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5">
                          {content}
                        </div>
                      )}
                      {canDeleteTransaction(transaction) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-10"
                          onClick={() => setPendingDelete(transaction)}
                        >
                          Delete
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card
            variant="panel"
            className="gap-0 p-4 sm:p-5 xl:col-start-2 xl:row-start-1"
          >
            <h2 className="px-1 text-lg font-bold text-sea-ink">
              Manage this debt
            </h2>
            <ul className="mt-2 space-y-0.5">
              <ManageAction
                icon={Pencil}
                label="Edit"
                hint="Change the name or starting amount"
                onClick={() => {
                  setName(debt.name)
                  setOpening(formatAmountInput(String(debt.openingBalance)))
                  setError(null)
                  setEditorOpen(true)
                }}
              />
              {mergeTargets.length > 0 && (
                <ManageAction
                  icon={Merge}
                  label="Merge into another debt"
                  hint="Move everything here into another debt"
                  onClick={() => {
                    setMergeTargetId(
                      mergeTargets.length === 1 ? mergeTargets[0].id : '',
                    )
                    setMergeError(null)
                    setMergeOpen(true)
                  }}
                />
              )}
              {debt.archived ? (
                <ManageAction
                  icon={ArchiveRestore}
                  label="Restore"
                  hint="Bring it back to your list"
                  onClick={() => void restore()}
                />
              ) : (
                <ManageAction
                  icon={Archive}
                  label="Archive"
                  hint={
                    debt.remaining !== 0
                      ? 'Bring what is left to zero first'
                      : 'Hide it from your list. Its history stays.'
                  }
                  disabled={debt.remaining !== 0}
                  title={
                    debt.remaining !== 0
                      ? 'Settle or adjust the remaining balance to zero before archiving'
                      : undefined
                  }
                  onClick={() => void archive()}
                />
              )}
            </ul>
          </Card>
        </div>
      </main>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent sheet>
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
