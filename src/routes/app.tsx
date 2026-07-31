import { createFileRoute, Link } from '@tanstack/react-router'
import { Waves } from 'lucide-react'
import { useReducer, useState } from 'react'

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
import {
  CYCLE_BUDGET,
  CYCLE_DAYS_REMAINING,
  USD_RATE,
  formatK,
  seedAccounts,
  seedBudgets,
  seedReconcile,
  seedTransactions,
} from '#/lib/app-data'

import type { QuickAddInitial, QuickAddPayload, Txn } from '#/lib/app-data'
import type { AutoSaveStatus } from '#/components/app/auto-save-card'

export const Route = createFileRoute('/app')({ component: AppHome })

const INITIAL_CYCLE_SPEND = 358000

interface AutoSaveState {
  status: AutoSaveStatus
  amount: number
  sourceName: string
}

interface AppState {
  accounts: typeof seedAccounts
  transactions: Txn[]
  budgets: typeof seedBudgets
  autoSave: AutoSaveState
  savingsBalance: number
  reconcile: typeof seedReconcile
}

type AppAction =
  | { type: 'transaction-saved'; payload: QuickAddPayload; id: string }
  | { type: 'auto-save-amount-changed'; amount: number }
  | { type: 'auto-save-dismissed' }
  | { type: 'auto-save-confirmed'; id: string }
  | { type: 'reconcile-actual-changed'; accountId: string; actual: number }
  | { type: 'reconcile-adjustment-absorbed'; accountId: string; id: string }

function createInitialState(): AppState {
  return {
    accounts: seedAccounts.map((account) => ({ ...account })),
    transactions: seedTransactions.map((transaction) => ({ ...transaction })),
    budgets: seedBudgets.map((budget) => ({ ...budget })),
    autoSave: {
      status: 'proposed',
      amount: 370000,
      sourceName: 'salary',
    },
    savingsBalance: 315000,
    reconcile: seedReconcile.map((balance) => ({ ...balance })),
  }
}

function prependTransaction(
  transactions: Txn[],
  transaction: Omit<Txn, 'id' | 'day'>,
  id: string,
) {
  return [{ ...transaction, id, day: 'Today' }, ...transactions]
}

function changeAccountBalance(
  accounts: AppState['accounts'],
  accountId: string,
  delta: number,
) {
  return accounts.map((account) =>
    account.id === accountId
      ? { ...account, balance: account.balance + delta }
      : account,
  )
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'transaction-saved': {
      const { payload, id } = action

      if (payload.type === 'expense') {
        const reconcile = payload.reconcile
          ? state.reconcile.map((balance) =>
              balance.accountId === payload.accountId
                ? {
                    ...balance,
                    expected: balance.expected - payload.amount,
                  }
                : balance,
            )
          : state.reconcile

        return {
          ...state,
          accounts: changeAccountBalance(
            state.accounts,
            payload.accountId,
            -payload.amount,
          ),
          transactions: prependTransaction(
            state.transactions,
            {
              type: 'expense',
              amount: payload.amount,
              payee: payload.payee,
              categoryId: payload.categoryId,
              accountId: payload.accountId,
              walletId: 'spending',
              items: payload.items,
              note: payload.note,
              reconcile: payload.reconcile,
            },
            id,
          ),
          budgets: payload.categoryId
            ? state.budgets.map((budget) =>
                budget.categoryId === payload.categoryId
                  ? { ...budget, spent: budget.spent + payload.amount }
                  : budget,
              )
            : state.budgets,
          reconcile,
        }
      }

      if (payload.type === 'income') {
        return {
          ...state,
          accounts: changeAccountBalance(
            state.accounts,
            payload.accountId,
            payload.amount,
          ),
          transactions: prependTransaction(
            state.transactions,
            {
              type: 'income',
              amount: payload.amount,
              payee: payload.payee,
              accountId: payload.accountId,
              walletId: 'spending',
              note: payload.note,
            },
            id,
          ),
          autoSave: {
            status: 'proposed',
            amount: Math.round(payload.amount * 0.2),
            sourceName: 'income',
          },
        }
      }

      if (!payload.toAccountId) return state

      return {
        ...state,
        accounts: state.accounts.map((account) => {
          if (account.id === payload.accountId) {
            return { ...account, balance: account.balance - payload.amount }
          }
          if (account.id === payload.toAccountId) {
            return { ...account, balance: account.balance + payload.amount }
          }
          return account
        }),
        transactions: prependTransaction(
          state.transactions,
          {
            type: 'transfer',
            amount: payload.amount,
            payee: payload.payee,
            accountId: payload.accountId,
            toAccountId: payload.toAccountId,
            walletId: 'spending',
            note: payload.note,
          },
          id,
        ),
      }
    }
    case 'auto-save-amount-changed':
      return {
        ...state,
        autoSave: { ...state.autoSave, amount: action.amount },
      }
    case 'auto-save-dismissed':
      return {
        ...state,
        autoSave: { ...state.autoSave, status: 'dismissed' },
      }
    case 'auto-save-confirmed':
      return {
        ...state,
        savingsBalance: state.savingsBalance + state.autoSave.amount,
        transactions: prependTransaction(
          state.transactions,
          {
            type: 'transfer',
            amount: state.autoSave.amount,
            payee: `Auto-save — 20% of ${state.autoSave.sourceName}`,
            accountId: 'nbm',
            walletId: 'savings',
          },
          action.id,
        ),
        autoSave: { ...state.autoSave, status: 'saved' },
      }
    case 'reconcile-actual-changed':
      return {
        ...state,
        reconcile: state.reconcile.map((balance) =>
          balance.accountId === action.accountId
            ? { ...balance, actual: action.actual }
            : balance,
        ),
      }
    case 'reconcile-adjustment-absorbed': {
      const balance = state.reconcile.find(
        (item) => item.accountId === action.accountId,
      )
      if (!balance) return state

      const delta = balance.actual - balance.expected
      return {
        ...state,
        accounts: changeAccountBalance(state.accounts, action.accountId, delta),
        transactions: prependTransaction(
          state.transactions,
          {
            type: 'expense',
            amount: Math.abs(delta),
            payee: 'Balance adjustment',
            categoryId: 'adjustment',
            accountId: action.accountId,
            walletId: 'spending',
            reconcile: true,
            adjustment: true,
            note: 'Reconcile 30 Jul',
          },
          action.id,
        ),
        reconcile: state.reconcile.map((item) =>
          item.accountId === action.accountId
            ? { ...item, expected: item.actual }
            : item,
        ),
      }
    }
  }
}

function AppHome() {
  return (
    <AppProviders>
      <AppDashboard />
    </AppProviders>
  )
}

function AppDashboard() {
  const [appState, dispatch] = useReducer(
    appReducer,
    undefined,
    createInitialState,
  )
  const {
    accounts,
    transactions,
    budgets,
    autoSave,
    savingsBalance,
    reconcile,
  } = appState
  const [sheet, setSheet] = useState<{
    open: boolean
    initial: QuickAddInitial
  }>({ open: false, initial: { mode: 'expense' } })

  const totalSpent =
    INITIAL_CYCLE_SPEND +
    transactions
      .filter(
        (transaction) =>
          transaction.id.startsWith('new-') && transaction.type === 'expense',
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  const spendingLeft = CYCLE_BUDGET - totalSpent
  const perDay = Math.max(0, Math.round(spendingLeft / CYCLE_DAYS_REMAINING))
  const netWorth = accounts.reduce(
    (sum, account) =>
      sum +
      (account.currency === 'USD'
        ? account.balance * USD_RATE
        : account.balance),
    0,
  )

  function openSheet(initial: QuickAddInitial) {
    setSheet({ open: true, initial })
  }

  function closeSheet() {
    setSheet((current) => ({ ...current, open: false }))
  }

  function createTransactionId() {
    return `new-${Date.now()}-${transactions.length}`
  }

  function saveTransaction(payload: QuickAddPayload) {
    dispatch({
      type: 'transaction-saved',
      payload,
      id: createTransactionId(),
    })
    closeSheet()
  }

  function confirmAutoSave() {
    dispatch({
      type: 'auto-save-confirmed',
      id: createTransactionId(),
    })
  }

  function absorbAdjustment(accountId: string) {
    dispatch({
      type: 'reconcile-adjustment-absorbed',
      accountId,
      id: createTransactionId(),
    })
  }

  const reconcileClosed = reconcile.every(
    (balance) => balance.expected === balance.actual,
  )

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="page-wrap pb-28 py-6 sm:py-8 lg:pb-10">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <section>
              <p className="island-kicker">
                Thursday, 30 July · Jul cycle · day 11 of 31
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
                /day until 19 Aug.
              </p>
            </section>
            <QuickAddCard onOpen={openSheet} animationDelay="60ms" />
            <AutoSaveCard
              status={autoSave.status}
              amount={autoSave.amount}
              sourceName={autoSave.sourceName}
              onAmountChange={(amount) =>
                dispatch({ type: 'auto-save-amount-changed', amount })
              }
              onConfirm={confirmAutoSave}
              onDismiss={() => dispatch({ type: 'auto-save-dismissed' })}
              animationDelay="120ms"
            />
            <TransactionsCard
              transactions={transactions}
              accounts={accounts}
              animationDelay="180ms"
            />
          </div>
          <div className="space-y-5">
            <NetWorthCard
              accounts={accounts}
              netWorth={netWorth}
              spendingLeft={spendingLeft}
              savingsBalance={savingsBalance}
              animationDelay="240ms"
            />
            <IncomeCard animationDelay="300ms" />
            <BudgetCard
              budgets={budgets}
              totalSpent={totalSpent}
              spendingLeft={spendingLeft}
              perDay={perDay}
              animationDelay="360ms"
            />
            <ReconcileCard
              accounts={accounts}
              balances={reconcile}
              closed={reconcileClosed}
              onActualChange={(accountId, actual) =>
                dispatch({
                  type: 'reconcile-actual-changed',
                  accountId,
                  actual,
                })
              }
              onAbsorb={absorbAdjustment}
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
          <p>
            Everything here is local prototype data; nothing leaves your device.
          </p>
          <Link to="/" className="font-bold text-lagoon-deep no-underline">
            ← Back to site
          </Link>
        </footer>
      </main>
      <QuickAddFab onOpen={openSheet} />
      {sheet.open && (
        <QuickAddSheet
          open={sheet.open}
          initial={sheet.initial}
          accounts={accounts}
          onClose={closeSheet}
          onSave={saveTransaction}
        />
      )}
    </div>
  )
}
