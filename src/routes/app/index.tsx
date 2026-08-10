import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { Waves } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { AppHeader } from '#/components/app/app-header'
import { AppProviders } from '#/components/app/app-providers'
import { AutoSaveCard } from '#/components/app/auto-save-card'
import { BudgetCard } from '#/components/app/budget-card'
import { IncomeCard } from '#/components/app/income-card'
import { NetWorthCard } from '#/components/app/net-worth-card'
import {
  QuickAddCard,
  QuickAddFab,
  QuickAddSheet,
} from '#/components/app/quick-add'
import { ReconcileCard } from '#/components/app/reconcile-card'
import { TransactionsCard } from '#/components/app/transactions-card'
import { Button } from '#/components/ui/button'
import { accountMwkValue, formatK, isSpendableAccount } from '#/lib/app-data'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'

import type { FunctionReturnType } from 'convex/server'
import type { Id } from '../../../convex/_generated/dataModel'
import type { AutoSaveStatus } from '#/components/app/auto-save-card'
import type {
  Account,
  BudgetCategory,
  IncomeSource,
  QuickAddInitial,
  QuickAddPayload,
  ReconcileBalance,
  Txn,
  Wallet,
} from '#/lib/app-data'
import type { Category } from '#/lib/categories'

const DAY_MS = 86_400_000

type BootstrapData = NonNullable<FunctionReturnType<typeof api.misi.bootstrap>>
type ReadyBootstrapData = BootstrapData & {
  settings: NonNullable<BootstrapData['settings']>
  currentCycle: NonNullable<BootstrapData['currentCycle']>
}

interface AutoSaveUiState {
  transactionId: string
  status: AutoSaveStatus
  amount: number
  sourceName: string
  savingsRate: number
  occurredAt: number
}

export const Route = createFileRoute('/app/')({
  loader: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData(
      convexQuery(api.misi.bootstrap, {}),
    )
    if (data === null || !data.settings?.onboardedAt) {
      throw redirect({ to: '/onboarding' })
    }
    return { now: Date.now() }
  },
  component: AppHome,
})

function sameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function transactionDayLabel(occurredAt: number, now: number) {
  const date = new Date(occurredAt)
  const today = new Date(now)
  if (sameCalendarDay(date, today)) return 'Today'

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (sameCalendarDay(date, yesterday)) return 'Yesterday'

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(date)
    .replace(',', '')
}

function shortDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Blantyre',
  }).format(new Date(timestamp))
}

function ordinalDay(day: number) {
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? 'th'
      : day % 10 === 1
        ? 'st'
        : day % 10 === 2
          ? 'nd'
          : day % 10 === 3
            ? 'rd'
            : 'th'
  return `${day}${suffix}`
}

function expectedWindowLabel(start: number, end: number) {
  if (start === end) return ordinalDay(start)
  return `${ordinalDay(start)}–${ordinalDay(end)}`
}

function mutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

function LoadingState({ children }: { children: string }) {
  return (
    <div className="page-wrap py-20 text-center text-sea-ink-soft">
      {children}
    </div>
  )
}

function AppHome() {
  const { now } = Route.useLoaderData()
  const { data } = useSuspenseQuery(convexQuery(api.misi.bootstrap, {}))
  const ensureSeedData = useMutation(api.misi.ensureSeedData)
  const requestedSeed = useRef(false)
  const [setupError, setSetupError] = useState<string | null>(null)

  const cycleNeedsRollover =
    data?.currentCycle != null && data.currentCycle.endsAt < now

  useEffect(() => {
    if (requestedSeed.current || !cycleNeedsRollover) return
    requestedSeed.current = true
    void ensureSeedData({}).catch((error) => {
      requestedSeed.current = false
      setSetupError(
        mutationErrorMessage(error, 'Unable to set up your Misi data'),
      )
      console.error('Unable to set up Misi data', error)
    })
  }, [cycleNeedsRollover, ensureSeedData])

  if (data === null) {
    return <LoadingState>Loading your accounts…</LoadingState>
  }

  if (cycleNeedsRollover) {
    return (
      <LoadingState>{setupError ?? 'Starting your new cycle…'}</LoadingState>
    )
  }

  if (!data.settings || !data.currentCycle) {
    return <LoadingState>Loading your accounts…</LoadingState>
  }

  return (
    <AppProviders>
      <AppDashboard data={data as ReadyBootstrapData} now={now} />
    </AppProviders>
  )
}

function AppDashboard({
  data,
  now,
}: {
  data: ReadyBootstrapData
  now: number
}) {
  const navigate = useNavigate({ from: Route.fullPath })
  const addTransaction = useMutation(api.misi.addTransaction)
  const updateTransaction = useMutation(api.misi.updateTransaction)
  const confirmAutoSaveMutation = useMutation(api.misi.confirmAutoSave)
  const dismissAutoSaveMutation = useMutation(api.misi.dismissAutoSave)
  const absorbAdjustmentMutation = useMutation(api.misi.absorbAdjustment)
  const [sheet, setSheet] = useState<{
    open: boolean
    initial: QuickAddInitial
  }>({ open: false, initial: { mode: 'expense' } })
  const [localAutoSaveUi, setLocalAutoSaveUi] =
    useState<AutoSaveUiState | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [quickAddError, setQuickAddError] = useState<string | null>(null)

  const accounts = useMemo<Account[]>(
    () =>
      data.accounts.map((account) => ({
        id: account._id,
        name: account.name,
        kind: account.kind,
        currency: account.currency,
        balance: account.balance,
      })),
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
        isSystem: category.isSystem,
        archived: category.archivedAt !== undefined,
      })),
    [data.categories],
  )

  const transactions = useMemo<Txn[]>(
    () =>
      data.transactions.map((transaction) => ({
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        payee: transaction.payee,
        categoryId: transaction.categoryId,
        accountId: transaction.accountId,
        toAccountId: transaction.toAccountId,
        walletId: transaction.walletId,
        sourceId: transaction.sourceId,
        items: transaction.items,
        note: transaction.note,
        excludeFromBudget: transaction.excludeFromBudget,
        occurredAt: transaction.occurredAt,
        day: transactionDayLabel(transaction.occurredAt, now),
        adjustment: transaction.adjustment ? true : undefined,
        autoSave: transaction.autoSave ? true : undefined,
      })),
    [data.transactions, now],
  )

  const cycleInfo = useMemo(() => {
    const cycle = data.currentCycle
    const totalDays = Math.max(
      1,
      Math.ceil((cycle.endsAt + 1 - cycle.startsAt) / DAY_MS),
    )
    const dayNumber = Math.min(
      totalDays,
      Math.max(1, Math.floor((now - cycle.startsAt) / DAY_MS) + 1),
    )
    const daysRemaining = Math.max(0, Math.ceil((cycle.endsAt - now) / DAY_MS))
    const today = new Date(now)
    const todayShort = shortDate(now)

    return {
      label: cycle.label,
      spendingLimit: cycle.spendingLimit,
      totalDays,
      dayNumber,
      daysRemaining,
      dayOf: `day ${dayNumber} of ${totalDays}`,
      headerBadge: `${cycle.label} · day ${dayNumber}`,
      greetingDate: new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(today),
      endsOn: shortDate(cycle.endsAt),
      reconcileNote: `Reconcile ${todayShort}`,
      lastClosed: `opened ${shortDate(cycle.startsAt)}`,
      cycleGain: data.transactions.reduce((sum, transaction) => {
        if (transaction.type === 'income') return sum + transaction.amount
        if (transaction.type === 'expense') return sum - transaction.amount
        return sum
      }, 0),
    }
  }, [data.currentCycle, data.transactions, now])

  const totalSpent = data.transactions
    .filter(
      (transaction) =>
        transaction.type === 'expense' &&
        transaction.excludeFromBudget !== true,
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const spendingLeft = cycleInfo.spendingLimit - totalSpent
  const perDay =
    cycleInfo.daysRemaining > 0
      ? Math.max(0, Math.round(spendingLeft / cycleInfo.daysRemaining))
      : 0
  const netWorth = accounts.reduce(
    (sum, account) => sum + accountMwkValue(account, data.settings.usdRate),
    0,
  )
  const savingsBalance =
    data.savingsBalance ?? data.settings.savingsOpeningBalance
  const autoSaveRateForPayee = useCallback(
    (payee: string) => {
      const normalizedPayee = payee.trim().toLowerCase()
      if (!normalizedPayee) return data.settings.defaultSavingsRate
      const plan = data.cycleIncomePlans.find((candidate) => {
        const sourceName = candidate.sourceName.toLowerCase()
        return (
          normalizedPayee === sourceName ||
          normalizedPayee.includes(sourceName) ||
          sourceName.includes(normalizedPayee)
        )
      })
      return plan?.savingsRate ?? data.settings.defaultSavingsRate
    },
    [data.cycleIncomePlans, data.settings.defaultSavingsRate],
  )

  const budgets = useMemo<BudgetCategory[]>(
    () =>
      data.budgets.map((budget) => ({
        categoryId: budget.categoryId,
        plannedAmount: budget.plannedAmount,
        spent: data.transactions
          .filter(
            (transaction) =>
              transaction.type === 'expense' &&
              transaction.excludeFromBudget !== true &&
              transaction.categoryId === budget.categoryId,
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0),
      })),
    [data.budgets, data.transactions],
  )

  const incomeSources = useMemo<IncomeSource[]>(
    () =>
      data.cycleIncomePlans.map((plan) => {
        const incomeTransactions = data.transactions.filter(
          (transaction) =>
            transaction.type === 'income' &&
            (transaction.sourceId === plan.sourceId ||
              transaction.payee
                .toLowerCase()
                .includes(plan.sourceName.toLowerCase())),
        )
        const landedAmount = incomeTransactions.reduce(
          (sum, transaction) => sum + transaction.amount,
          0,
        )
        const latestIncome = incomeTransactions.at(0)
        return {
          id: plan.sourceId,
          name: plan.sourceName,
          expectedWindow: expectedWindowLabel(
            plan.expectedDayStart,
            plan.expectedDayEnd,
          ),
          expectedAmount: plan.expectedAmount,
          expectedAmountMax: plan.expectedAmountMax,
          landedAmount,
          status:
            landedAmount >= plan.expectedAmount
              ? 'landed'
              : landedAmount > 0
                ? 'partial'
                : 'pending',
          statusNote: latestIncome
            ? `Landed ${transactionDayLabel(latestIncome.occurredAt, now)}`
            : `Expected ${expectedWindowLabel(plan.expectedDayStart, plan.expectedDayEnd)}`,
          savingsRate: plan.savingsRate,
        }
      }),
    [data.cycleIncomePlans, data.transactions, now],
  )

  const unitTrustAccount = accounts.find((account) =>
    account.name.toLowerCase().includes('unit trust'),
  )
  const usdAccount = accounts.find(
    (account) =>
      account.currency === 'USD' || account.name.toLowerCase().includes('usd'),
  )
  const wallets: Wallet[] = [
    {
      id: 'spending',
      name: 'Spending',
      balance: spendingLeft,
      currency: 'MWK',
      detail: `K${spendingLeft.toLocaleString()} left of K${cycleInfo.spendingLimit.toLocaleString()}`,
    },
    {
      id: 'savings',
      name: 'Savings',
      balance: savingsBalance,
      currency: 'MWK',
    },
    ...(unitTrustAccount
      ? [
          {
            id: unitTrustAccount.id,
            name: 'Unit Trust',
            balance: unitTrustAccount.balance,
            currency: unitTrustAccount.currency,
          } satisfies Wallet,
        ]
      : []),
    ...(usdAccount
      ? [
          {
            id: usdAccount.id,
            name: 'USD',
            balance: usdAccount.balance,
            currency: usdAccount.currency,
          } satisfies Wallet,
        ]
      : []),
    ...data.debts.map(
      (debt) =>
        ({
          id: `debt-${debt._id}`,
          name: debt.name,
          balance: debt.balance,
          currency: 'MWK',
        }) satisfies Wallet,
    ),
  ]

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
  const [actualOverrides, setActualOverrides] = useState<
    Record<string, { expected: number; actual: number } | undefined>
  >({})

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
    data.settings.defaultExpenseAccountId ||
    expectedBalances[0]?.accountId ||
    ''
  const defaultTransferFromAccountId =
    data.settings.defaultTransferFromAccountId ||
    expectedBalances[0]?.accountId ||
    ''
  const defaultTransferToAccountId =
    data.settings.defaultTransferToAccountId ??
    expectedBalances.find(
      (balance) => balance.accountId !== defaultTransferFromAccountId,
    )?.accountId ??
    defaultTransferFromAccountId

  const resolveAccountId = useCallback(
    (accountId: string) => {
      if (accounts.some((account) => account.id === accountId)) return accountId
      const prototypeNames: Record<string, string> = {
        nbs: 'nbs bank',
        fdh: 'fdh bank',
        airtel: 'airtel money',
        cash: 'cash',
      }
      const expectedName = prototypeNames[accountId]
      return (
        accounts.find((account) => account.name.toLowerCase() === expectedName)
          ?.id ?? defaultExpenseAccountId
      )
    },
    [accounts, defaultExpenseAccountId],
  )

  const pendingAutoSave = data.pendingAutoSave
  const autoSaveUi: AutoSaveUiState | null = pendingAutoSave
    ? localAutoSaveUi?.transactionId === pendingAutoSave.transactionId
      ? localAutoSaveUi
      : {
          transactionId: pendingAutoSave.transactionId,
          status: 'proposed',
          amount: pendingAutoSave.amount,
          sourceName: pendingAutoSave.sourceName,
          savingsRate: pendingAutoSave.savingsRate,
          occurredAt: pendingAutoSave.occurredAt,
        }
    : localAutoSaveUi?.status === 'saved' ||
        localAutoSaveUi?.status === 'dismissed'
      ? localAutoSaveUi
      : null

  function openSheet(initial: QuickAddInitial) {
    setQuickAddError(null)
    setSheet({
      open: true,
      initial: {
        ...initial,
        occurredAt: initial.occurredAt ?? Date.now(),
        accountId: initial.accountId
          ? resolveAccountId(initial.accountId)
          : undefined,
        toAccountId: initial.toAccountId
          ? resolveAccountId(initial.toAccountId)
          : undefined,
      },
    })
  }

  function closeSheet() {
    setQuickAddError(null)
    setSheet((current) => ({ ...current, open: false }))
  }

  function editTransaction(transaction: Txn) {
    if (transaction.adjustment || transaction.autoSave) return
    openSheet({
      transactionId: transaction.id,
      mode: transaction.type,
      amount: transaction.amount,
      categoryId: transaction.categoryId,
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId,
      payee: transaction.payee,
      sourceId: transaction.sourceId,
      items: transaction.items,
      note: transaction.note,
      occurredAt: transaction.occurredAt,
      excludeFromBudget: transaction.excludeFromBudget,
    })
  }

  const resolveIncomeSourceId = useCallback(
    (payload: QuickAddPayload): Id<'incomeSources'> | undefined => {
      if (payload.sourceId) return payload.sourceId as Id<'incomeSources'>
      if (payload.type !== 'income') return undefined

      const payee = payload.payee.trim().toLowerCase()
      if (!payee) return undefined

      const match = data.incomeSources.find((source) => {
        const name = source.name.toLowerCase()
        return payee === name || payee.includes(name) || name.includes(payee)
      })

      return match?._id
    },
    [data.incomeSources],
  )

  async function saveTransaction(payload: QuickAddPayload) {
    setQuickAddError(null)
    try {
      const sourceId = resolveIncomeSourceId(payload)
      const transaction = {
        type: payload.type,
        amount: payload.amount,
        payee: payload.payee,
        categoryId: payload.categoryId,
        accountId: payload.accountId as Id<'accounts'>,
        toAccountId: payload.toAccountId as Id<'accounts'> | undefined,
        items: payload.items,
        note: payload.note,
        sourceId,
        excludeFromBudget: payload.excludeFromBudget,
      }
      if (payload.transactionId) {
        if (payload.occurredAt === undefined) {
          throw new Error('Transaction date is missing')
        }
        await updateTransaction({
          transactionId: payload.transactionId as Id<'transactions'>,
          ...transaction,
          occurredAt: payload.occurredAt,
        })
      } else {
        await addTransaction({
          ...transaction,
          occurredAt: payload.occurredAt,
        })
      }
      closeSheet()
    } catch (error) {
      const message = mutationErrorMessage(
        error,
        'Unable to save transaction. Check the details and try again.',
      )
      setQuickAddError(message)
      console.error('Unable to save transaction', error)
    }
  }

  async function confirmAutoSave() {
    if (!autoSaveUi || autoSaveUi.status !== 'proposed') return
    setActionError(null)
    try {
      await confirmAutoSaveMutation({
        transactionId: autoSaveUi.transactionId as Id<'transactions'>,
        amount: autoSaveUi.amount,
      })
      setLocalAutoSaveUi({ ...autoSaveUi, status: 'saved' })
    } catch (error) {
      const message = mutationErrorMessage(
        error,
        'Unable to confirm auto-save. Try again.',
      )
      setActionError(message)
      console.error('Unable to confirm auto-save', error)
    }
  }

  async function dismissAutoSave() {
    if (!autoSaveUi || autoSaveUi.status !== 'proposed') return
    setActionError(null)
    try {
      await dismissAutoSaveMutation({
        transactionId: autoSaveUi.transactionId as Id<'transactions'>,
        amount: autoSaveUi.amount,
      })
      setLocalAutoSaveUi({ ...autoSaveUi, status: 'dismissed' })
    } catch (error) {
      const message = mutationErrorMessage(
        error,
        'Unable to dismiss auto-save. Try again.',
      )
      setActionError(message)
      console.error('Unable to dismiss auto-save', error)
    }
  }

  async function absorbAdjustment(accountId: string) {
    const balance = reconcile.find((item) => item.accountId === accountId)
    if (!balance) return
    setActionError(null)
    try {
      await absorbAdjustmentMutation({
        accountId: accountId as Id<'accounts'>,
        actual: balance.actual,
        note: cycleInfo.reconcileNote,
      })
    } catch (error) {
      const message = mutationErrorMessage(
        error,
        'Unable to absorb balance adjustment. Try again.',
      )
      setActionError(message)
      console.error('Unable to absorb balance adjustment', error)
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader badge={cycleInfo.headerBadge} />
      {actionError && (
        <div className="page-wrap pt-4">
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-2xl border border-coral/25 bg-coral/8 px-4 py-3"
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
        </div>
      )}
      <main className="page-wrap pb-28 py-6 sm:py-8 lg:pb-10">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <section>
              <p className="island-kicker">
                {cycleInfo.greetingDate} · {cycleInfo.label} · {cycleInfo.dayOf}
              </p>
              <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
                Good afternoon.
              </h1>
              <p className="mt-1.5 text-[0.95rem] text-sea-ink-soft">
                <span className="font-mono font-semibold text-sea-ink tabular-nums">
                  {formatK(spendingLeft)}
                </span>{' '}
                left in Spending —{' '}
                <span className="font-mono font-semibold text-sea-ink tabular-nums">
                  {formatK(perDay)}
                </span>
                /day until {cycleInfo.endsOn}.
              </p>
            </section>
            <QuickAddCard
              categories={categories}
              onOpen={openSheet}
              animationDelay="60ms"
            />
            {autoSaveUi && (
              <AutoSaveCard
                status={autoSaveUi.status}
                amount={autoSaveUi.amount}
                sourceName={autoSaveUi.sourceName}
                rateLabel={`${Math.round(autoSaveUi.savingsRate * 100)}%`}
                landedLabel={transactionDayLabel(autoSaveUi.occurredAt, now)}
                onAmountChange={(amount) =>
                  setLocalAutoSaveUi({ ...autoSaveUi, amount })
                }
                onConfirm={() => void confirmAutoSave()}
                onDismiss={() => void dismissAutoSave()}
                animationDelay="120ms"
              />
            )}
            <TransactionsCard
              transactions={transactions}
              accounts={accounts}
              categories={categories}
              cycleLabel={cycleInfo.label}
              animationDelay="180ms"
              onEdit={editTransaction}
            />
          </div>
          <div className="space-y-5">
            <NetWorthCard
              accounts={accounts}
              wallets={wallets}
              netWorth={netWorth}
              cycleBudget={cycleInfo.spendingLimit}
              cycleGain={cycleInfo.cycleGain}
              usdRate={data.settings.usdRate}
              animationDelay="240ms"
            />
            <IncomeCard
              sources={incomeSources}
              cycleLabel={cycleInfo.label}
              animationDelay="300ms"
              onAddIncomeSource={() =>
                void navigate({ to: '/app/income-sources' })
              }
            />
            <BudgetCard
              budgets={budgets}
              categories={categories}
              spendingLimit={cycleInfo.spendingLimit}
              dayNumber={cycleInfo.dayNumber}
              totalDays={cycleInfo.totalDays}
              daysRemaining={cycleInfo.daysRemaining}
              dayOf={cycleInfo.dayOf}
              endsOn={cycleInfo.endsOn}
              cycleStartsAt={data.currentCycle.startsAt}
              now={now}
              totalSpent={totalSpent}
              spendingLeft={spendingLeft}
              perDay={perDay}
              animationDelay="360ms"
              onAdjustBudgets={() => void navigate({ to: '/app/budget' })}
            />
            <ReconcileCard
              accounts={accounts}
              categories={categories}
              balances={reconcile}
              closed={reconcileClosed}
              lastClosed={cycleInfo.lastClosed}
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
              animationDelay="420ms"
            />
          </div>
        </div>
        <footer className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-(--line) pt-5 text-[0.8rem] text-sea-ink-soft sm:flex-row sm:items-center">
          <span className="flex items-center gap-2">
            <Waves className="size-4 text-lagoon-deep" />
            <span className="font-display font-bold text-sea-ink">Misi</span>
          </span>
          <p>Your data syncs securely across devices.</p>
          <Link to="/" className="font-bold text-lagoon-deep no-underline">
            ← Back to site
          </Link>
        </footer>
      </main>
      <QuickAddFab onOpen={openSheet} />
      {sheet.open && (
        <QuickAddSheet
          initial={sheet.initial}
          categories={categories}
          accounts={accounts}
          defaultExpenseAccountId={defaultExpenseAccountId}
          defaultTransferFromAccountId={defaultTransferFromAccountId}
          defaultTransferToAccountId={defaultTransferToAccountId}
          reconcileNote={cycleInfo.reconcileNote}
          autoSaveRateForPayee={autoSaveRateForPayee}
          resolveAccountId={resolveAccountId}
          error={quickAddError}
          onClose={closeSheet}
          onSave={(payload) => void saveTransaction(payload)}
        />
      )}
    </div>
  )
}
