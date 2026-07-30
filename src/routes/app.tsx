import { createFileRoute, Link } from '@tanstack/react-router'
import { Waves } from 'lucide-react'
import { useState } from 'react'

import { AppHeader } from '#/components/app/app-header'
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

function AppHome() {
  const [accounts, setAccounts] = useState(() =>
    seedAccounts.map((account) => ({ ...account })),
  )
  const [transactions, setTransactions] = useState(() =>
    seedTransactions.map((transaction) => ({ ...transaction })),
  )
  const [budgets, setBudgets] = useState(() =>
    seedBudgets.map((budget) => ({ ...budget })),
  )
  const [autoSave, setAutoSave] = useState<AutoSaveState>({
    status: 'proposed',
    amount: 370000,
    sourceName: 'salary',
  })
  const [savingsBalance, setSavingsBalance] = useState(315000)
  const [reconcile, setReconcile] = useState(() =>
    seedReconcile.map((balance) => ({ ...balance })),
  )
  const [reconcileClosed, setReconcileClosed] = useState(false)
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

  function prependTransaction(transaction: Omit<Txn, 'id' | 'day'>) {
    setTransactions((current) => [
      {
        ...transaction,
        id: `new-${Date.now()}-${current.length}`,
        day: 'Today',
      },
      ...current,
    ])
  }

  function updateAccountBalance(accountId: string, delta: number) {
    setAccounts((current) =>
      current.map((account) =>
        account.id === accountId
          ? { ...account, balance: account.balance + delta }
          : account,
      ),
    )
  }

  function closeReconcileGapWithExpense(accountId: string, amount: number) {
    const next = reconcile.map((balance) =>
      balance.accountId === accountId
        ? { ...balance, expected: balance.expected - amount }
        : balance,
    )
    setReconcile(next)
    if (next.every((balance) => balance.expected === balance.actual)) {
      setReconcileClosed(true)
    }
  }

  function saveTransaction(payload: QuickAddPayload) {
    if (payload.type === 'expense') {
      prependTransaction({
        type: 'expense',
        amount: payload.amount,
        payee: payload.payee,
        categoryId: payload.categoryId,
        accountId: payload.accountId,
        walletId: 'spending',
        items: payload.items,
        note: payload.note,
        reconcile: payload.reconcile,
      })
      updateAccountBalance(payload.accountId, -payload.amount)
      if (payload.categoryId) {
        setBudgets((current) =>
          current.map((budget) =>
            budget.categoryId === payload.categoryId
              ? { ...budget, spent: budget.spent + payload.amount }
              : budget,
          ),
        )
      }
      if (payload.reconcile) {
        closeReconcileGapWithExpense(payload.accountId, payload.amount)
      }
    } else if (payload.type === 'income') {
      prependTransaction({
        type: 'income',
        amount: payload.amount,
        payee: payload.payee,
        accountId: payload.accountId,
        walletId: 'spending',
        note: payload.note,
      })
      updateAccountBalance(payload.accountId, payload.amount)
      setAutoSave({
        status: 'proposed',
        amount: Math.round(payload.amount * 0.2),
        sourceName: 'income',
      })
    } else if (payload.toAccountId) {
      prependTransaction({
        type: 'transfer',
        amount: payload.amount,
        payee: payload.payee,
        accountId: payload.accountId,
        toAccountId: payload.toAccountId,
        walletId: 'spending',
        note: payload.note,
      })
      setAccounts((current) =>
        current.map((account) => {
          if (account.id === payload.accountId) {
            return { ...account, balance: account.balance - payload.amount }
          }
          if (account.id === payload.toAccountId) {
            return { ...account, balance: account.balance + payload.amount }
          }
          return account
        }),
      )
    }
    closeSheet()
  }

  function confirmAutoSave() {
    setSavingsBalance((current) => current + autoSave.amount)
    prependTransaction({
      type: 'transfer',
      amount: autoSave.amount,
      payee: `Auto-save — 20% of ${autoSave.sourceName}`,
      accountId: 'nbm',
      walletId: 'savings',
    })
    setAutoSave((current) => ({ ...current, status: 'saved' }))
  }

  function absorbAdjustment(accountId: string) {
    const balance = reconcile.find((item) => item.accountId === accountId)
    if (!balance) return
    const delta = balance.actual - balance.expected
    const amount = Math.abs(delta)
    updateAccountBalance(accountId, delta)
    prependTransaction({
      type: 'expense',
      amount,
      payee: 'Balance adjustment',
      categoryId: 'adjustment',
      accountId,
      walletId: 'spending',
      reconcile: true,
      adjustment: true,
      note: 'Reconcile 30 Jul',
    })
    setReconcile((current) =>
      current.map((item) =>
        item.accountId === accountId
          ? { ...item, expected: item.actual }
          : item,
      ),
    )
    if (
      reconcile.every((item) =>
        item.accountId === accountId ? true : item.expected === item.actual,
      )
    ) {
      setReconcileClosed(true)
    }
  }

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
                setAutoSave((current) => ({ ...current, amount }))
              }
              onConfirm={confirmAutoSave}
              onDismiss={() =>
                setAutoSave((current) => ({
                  ...current,
                  status: 'dismissed',
                }))
              }
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
                setReconcile((current) =>
                  current.map((balance) =>
                    balance.accountId === accountId
                      ? { ...balance, actual }
                      : balance,
                  ),
                )
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
