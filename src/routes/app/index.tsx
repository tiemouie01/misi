import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useHydrated } from '@tanstack/react-router'
import { useMutation, usePaginatedQuery } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import {
  incomeSourceStatus,
  landedAmountForSource,
} from '../../../shared/income'
import { greeting } from '#/lib/greeting'
import { AppProviders } from '#/components/app/app-providers'
import { DebtsCard } from '#/components/app/debts-card'
import { MoneyCard } from '#/components/app/money-card'
import { useQuickAdd } from '#/components/app/quick-add-provider'
import { SummaryTiles, spendingPace } from '#/components/app/summary-tiles'
import { TodoCard } from '#/components/app/todo-card'
import { TransactionsCard } from '#/components/app/transactions-card'
import {
  accountMwkValue,
  canMutateTransaction,
  formatK,
  mapAccount,
  spendableTotalMwk,
} from '#/lib/app-data'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'
import { mapDebt } from '#/lib/debts'
import { errorMessage } from '#/lib/error-message'

import type { FunctionReturnType } from 'convex/server'
import type { Doc } from '../../../convex/_generated/dataModel'
import type { NewAccountInput } from '#/components/app/account-dialogs'
import type { TodoIncome } from '#/components/app/todo-card'
import type { Account, Txn } from '#/lib/app-data'
import type { Category } from '#/lib/categories'

const DAY_MS = 86_400_000

/** Reuse date formatters across the transaction feed instead of constructing
 * a new Intl.DateTimeFormat for every rendered row. */
const dayLabelFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const dayLabelWithYearFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const FEED_PAGE_SIZE = 50

const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Blantyre',
})

const greetingDateFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

type BootstrapData = NonNullable<FunctionReturnType<typeof api.misi.bootstrap>>
type ReadyBootstrapData = Omit<BootstrapData, 'oneTapRecents'> & {
  settings: NonNullable<BootstrapData['settings']>
  currentCycle: NonNullable<BootstrapData['currentCycle']>
  oneTapRecents?: BootstrapData['oneTapRecents']
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

  const format =
    date.getFullYear() === today.getFullYear()
      ? dayLabelFormat
      : dayLabelWithYearFormat
  return format.format(date).replace(',', '')
}

function toTxn(transaction: Doc<'transactions'>, now: number): Txn {
  return {
    id: transaction._id,
    type: transaction.type,
    amount: transaction.amount,
    fxRate: transaction.fxRate,
    payee: transaction.payee,
    categoryId: transaction.categoryId,
    accountId: transaction.accountId,
    toAccountId: transaction.toAccountId,
    direction: transaction.direction,
    walletId: transaction.walletId,
    sourceId: transaction.sourceId,
    items: transaction.items,
    note: transaction.note,
    excludeFromBudget: transaction.excludeFromBudget,
    occurredAt: transaction.occurredAt,
    day: transactionDayLabel(transaction.occurredAt, now),
    debtId: transaction.debtId,
    claimAction: transaction.claimAction,
    adjustPolarity: transaction.adjustPolarity,
    adjustment: transaction.adjustment ? true : undefined,
    autoSave: transaction.autoSave ? true : undefined,
  }
}

function shortDate(timestamp: number) {
  return shortDateFormat.format(new Date(timestamp))
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
      setSetupError(errorMessage(error, 'Unable to set up your Misi data'))
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
  const confirmAutoSaveMutation = useMutation(api.misi.confirmAutoSave)
  const dismissAutoSaveMutation = useMutation(api.misi.dismissAutoSave)
  const moveSavingsMutation = useMutation(api.misi.moveSavings)
  const createAccountMutation = useMutation(api.misi.createAccount)
  const [autoSaveBusy, setAutoSaveBusy] = useState(false)
  const hydrated = useHydrated()
  const { openSheet, requestDelete } = useQuickAdd()

  // Archived accounts stay in the list so history still shows their names;
  // their balance is zero, so totals are unaffected.
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

  const transactions = useMemo<Txn[]>(
    () => data.transactions.map((transaction) => toTxn(transaction, now)),
    [data.transactions, now],
  )

  // The feed pages through all history; until the first page lands, show the
  // current cycle from bootstrap so the card never flashes empty.
  const feed = usePaginatedQuery(
    api.misi.listTransactions,
    {},
    { initialNumItems: FEED_PAGE_SIZE },
  )
  const feedTransactions = useMemo<Txn[]>(
    () =>
      feed.status === 'LoadingFirstPage'
        ? transactions
        : feed.results.map((transaction) => toTxn(transaction, now)),
    [feed.status, feed.results, transactions, now],
  )

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

  const totalSpent = data.transactions
    .filter(
      (transaction) =>
        transaction.type === 'expense' &&
        transaction.excludeFromBudget !== true,
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const spendingLeft = cycle.spendingLimit - totalSpent
  const perDay =
    daysRemaining > 0
      ? Math.max(0, Math.round(spendingLeft / daysRemaining))
      : Math.max(0, spendingLeft)

  const debts = useMemo(() => data.debts.map(mapDebt), [data.debts])
  const activeDebts = debts.filter((debt) => !debt.archived)
  const youOwe = activeDebts
    .filter((debt) => debt.direction === 'you_owe')
    .reduce((sum, debt) => sum + debt.remaining, 0)
  const owedToYou = activeDebts
    .filter((debt) => debt.direction === 'owed_to_you')
    .reduce((sum, debt) => sum + debt.remaining, 0)

  const activeAccounts = accounts.filter((account) => !account.archived)
  const totalInAccounts = activeAccounts.reduce(
    (sum, account) => sum + accountMwkValue(account, data.settings.usdRate),
    0,
  )
  const spendable = spendableTotalMwk(accounts, data.settings.usdRate)
  const savingsBalance =
    data.savingsBalance ?? data.settings.savingsOpeningBalance

  const pendingIncome = useMemo<TodoIncome[]>(
    () =>
      data.cycleIncomePlans.flatMap((plan) => {
        const landed = landedAmountForSource(data.transactions, plan.sourceId)
        const status = incomeSourceStatus(landed, plan.expectedAmount)
        if (status === 'landed' || plan.expectedAmount <= 0) return []
        return [
          {
            id: plan.sourceId,
            name: plan.sourceName,
            amount: Math.max(0, plan.expectedAmount - landed),
            partial: status === 'partial',
          },
        ]
      }),
    [data.cycleIncomePlans, data.transactions],
  )

  const pendingAutoSave = data.pendingAutoSave ?? null

  function editTransaction(transaction: Txn) {
    if (!canMutateTransaction(transaction)) return
    openSheet(
      {
        transactionId: transaction.id,
        mode: transaction.type,
        amount: transaction.amount,
        fxRate: transaction.fxRate,
        categoryId: transaction.categoryId,
        accountId: transaction.accountId,
        toAccountId: transaction.toAccountId,
        payee: transaction.payee,
        sourceId: transaction.sourceId,
        items: transaction.items,
        note: transaction.note,
        occurredAt: transaction.occurredAt,
        excludeFromBudget: transaction.excludeFromBudget,
        autoSave: transaction.autoSave,
        fromSavings:
          transaction.walletId === 'savings' &&
          transaction.type !== 'allocation',
        debtId: transaction.debtId,
        claimAction: transaction.claimAction,
        adjustPolarity: transaction.adjustPolarity,
      },
      transaction,
    )
  }

  async function confirmAutoSave(amount: number) {
    if (!pendingAutoSave || autoSaveBusy) return
    setAutoSaveBusy(true)
    try {
      await confirmAutoSaveMutation({
        transactionId: pendingAutoSave.transactionId,
        amount,
      })
      toast.success(`${formatK(amount)} saved`)
    } catch (error) {
      toast.error(errorMessage(error, 'Unable to save that. Try again.'))
      console.error('Unable to confirm auto-save', error)
    } finally {
      setAutoSaveBusy(false)
    }
  }

  async function dismissAutoSave() {
    if (!pendingAutoSave || autoSaveBusy) return
    setAutoSaveBusy(true)
    try {
      await dismissAutoSaveMutation({
        transactionId: pendingAutoSave.transactionId,
        amount: pendingAutoSave.amount,
      })
    } catch (error) {
      toast.error(errorMessage(error, 'Unable to dismiss that. Try again.'))
      console.error('Unable to dismiss auto-save', error)
    } finally {
      setAutoSaveBusy(false)
    }
  }

  async function moveSavings(input: {
    amount: number
    direction: 'toSavings' | 'toSpending'
  }) {
    try {
      await moveSavingsMutation(input)
      toast.success('Money moved')
    } catch (error) {
      toast.error(errorMessage(error, 'Unable to move money. Try again.'))
      console.error('Unable to move money', error)
      throw error
    }
  }

  async function createAccount(input: NewAccountInput) {
    await createAccountMutation(input)
    toast.success(`${input.name} added`)
  }

  return (
    <main className="page-wrap py-6 sm:py-8">
      <header>
        <p className="text-sm text-sea-ink-soft">
          {greetingDateFormat.format(new Date(now))}
        </p>
        <h1 className="font-display mt-1 text-[1.75rem] font-bold tracking-tight text-sea-ink sm:text-4xl">
          {greeting(hydrated ? new Date() : null, data.userName)}
        </h1>
      </header>

      <div className="mt-5 sm:mt-6">
        <SummaryTiles
          spendingLeft={spendingLeft}
          spendingLimit={cycle.spendingLimit}
          totalSpent={totalSpent}
          perDay={perDay}
          daysRemaining={daysRemaining}
          paydayLabel={shortDate(cycle.endsAt + 1)}
          pace={spendingPace({
            spendingLimit: cycle.spendingLimit,
            totalSpent,
            dayNumber,
            totalDays,
          })}
          totalInAccounts={totalInAccounts}
          accountCount={activeAccounts.length}
          youOwe={youOwe}
          owedToYou={owedToYou}
        />
      </div>

      {/* One column until `xl` (to-do first, then activity); from there the
          activity list takes the wide left column and the rest stack on the
          right. The flexible last row keeps the right-hand cards together
          however long the activity list grows. */}
      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:grid-rows-[auto_auto_1fr] xl:items-start">
        <TodoCard
          className="xl:col-start-2"
          autoSave={pendingAutoSave}
          autoSaveBusy={autoSaveBusy}
          pendingIncome={pendingIncome}
          onConfirmAutoSave={(amount) => void confirmAutoSave(amount)}
          onDismissAutoSave={() => void dismissAutoSave()}
          onIncomeArrived={(income) =>
            openSheet({
              mode: 'income',
              sourceId: income.id,
              amount: income.amount,
            })
          }
        />
        <TransactionsCard
          className="xl:col-start-1 xl:row-span-3 xl:row-start-1"
          transactions={feedTransactions}
          accounts={accounts}
          categories={categories}
          status={feed.status}
          onLoadMore={() => feed.loadMore(FEED_PAGE_SIZE)}
          onEdit={editTransaction}
          onDelete={requestDelete}
        />
        <MoneyCard
          className="xl:col-start-2"
          accounts={accounts}
          usdRate={data.settings.usdRate}
          spendable={spendable}
          savingsBalance={savingsBalance}
          onMoveSavings={moveSavings}
          onCreateAccount={createAccount}
        />
        <DebtsCard className="xl:col-start-2" debts={debts} />
      </div>
    </main>
  )
}
