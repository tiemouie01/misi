import { useMutation } from 'convex/react'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../convex/_generated/api'

import type { Id } from '../../convex/_generated/dataModel'
import type { Account, QuickAddInitial, QuickAddPayload } from '#/lib/app-data'

interface QuickAddSheetOptions {
  accounts: Account[]
  incomePlans: { sourceId: string; sourceName: string; savingsRate: number }[]
  defaultSavingsRate: number
  defaultExpenseAccountId: string
}

export function mutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

export function useQuickAddSheet({
  accounts,
  incomePlans,
  defaultSavingsRate,
  defaultExpenseAccountId,
}: QuickAddSheetOptions) {
  const addTransaction = useMutation(api.misi.addTransaction)
  const updateTransaction = useMutation(api.misi.updateTransaction)
  const removeTransaction = useMutation(api.misi.deleteTransaction)
  const [sheet, setSheet] = useState<{
    open: boolean
    initial: QuickAddInitial
  }>({ open: false, initial: { mode: 'expense' } })
  const [error, setError] = useState<string | null>(null)
  // Mirrors sheet.open for async callbacks; only openSheet/closeSheet set it.
  const sheetOpenRef = useRef(false)

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

  const autoSaveRateForSource = useCallback(
    (sourceId?: string) => {
      if (!sourceId) return defaultSavingsRate
      return (
        incomePlans.find((candidate) => candidate.sourceId === sourceId)
          ?.savingsRate ?? defaultSavingsRate
      )
    },
    [incomePlans, defaultSavingsRate],
  )

  const resolveIncomeSourceId = useCallback(
    (payload: QuickAddPayload): Id<'incomeSources'> | undefined => {
      if (payload.type !== 'income' || !payload.sourceId) return undefined
      return payload.sourceId as Id<'incomeSources'>
    },
    [],
  )

  function openSheet(initial: QuickAddInitial) {
    sheetOpenRef.current = true
    setError(null)
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
    sheetOpenRef.current = false
    setError(null)
    setSheet((current) => ({ ...current, open: false }))
  }

  async function saveTransaction(payload: QuickAddPayload) {
    // Convex resolves a mutation only once every subscribed query (bootstrap,
    // the feed, …) has re-run with it, so waiting to close the sheet makes
    // logging feel sluggish. Close new transactions straight away and bring
    // the sheet back with the error if the save fails.
    const isNew = !payload.transactionId
    if (isNew) closeSheet()
    else setError(null)
    try {
      if (payload.transactionId) {
        if (payload.occurredAt === undefined) {
          throw new Error('Transaction date is missing')
        }
        if (payload.type === 'allocation') {
          await updateTransaction({
            transactionId: payload.transactionId as Id<'transactions'>,
            type: 'allocation',
            amount: payload.amount,
            payee: payload.payee,
            note: payload.note,
            occurredAt: payload.occurredAt,
          })
        } else {
          await updateTransaction({
            transactionId: payload.transactionId as Id<'transactions'>,
            type: payload.type,
            amount: payload.amount,
            payee: payload.payee,
            categoryId: payload.categoryId,
            accountId: payload.accountId
              ? (payload.accountId as Id<'accounts'>)
              : undefined,
            toAccountId: payload.toAccountId as Id<'accounts'> | undefined,
            debtId: payload.debtId
              ? (payload.debtId as Id<'debts'>)
              : undefined,
            claimAction: payload.claimAction,
            adjustPolarity: payload.adjustPolarity,
            items: payload.items,
            note: payload.note,
            sourceId: resolveIncomeSourceId(payload),
            excludeFromBudget: payload.excludeFromBudget,
            fromSavings: payload.fromSavings,
            occurredAt: payload.occurredAt,
          })
        }
        toast.success('Transaction updated')
      } else if (payload.type !== 'allocation') {
        await addTransaction({
          type: payload.type,
          amount: payload.amount,
          payee: payload.payee,
          categoryId: payload.categoryId,
          accountId: payload.accountId
            ? (payload.accountId as Id<'accounts'>)
            : undefined,
          toAccountId: payload.toAccountId as Id<'accounts'> | undefined,
          debtId: payload.debtId ? (payload.debtId as Id<'debts'>) : undefined,
          claimAction: payload.claimAction,
          adjustPolarity: payload.adjustPolarity,
          items: payload.items,
          note: payload.note,
          sourceId: resolveIncomeSourceId(payload),
          excludeFromBudget: payload.excludeFromBudget,
          fromSavings: payload.fromSavings,
          occurredAt: payload.occurredAt,
        })
        toast.success('Transaction logged')
      } else {
        throw new Error(
          'Envelope moves are created from Spendable, not Quick add',
        )
      }
      if (!isNew) closeSheet()
    } catch (caught) {
      const message = mutationErrorMessage(
        caught,
        'Unable to save transaction. Check the details and try again.',
      )
      console.error('Unable to save transaction', caught)
      if (!isNew) {
        setError(message)
      } else if (sheetOpenRef.current) {
        // The user already started another entry; don't clobber it.
        toast.error(message)
      } else {
        const { type, ...fields } = payload
        openSheet({ ...fields, mode: type })
        setError(message)
      }
    }
  }

  async function deleteTransaction(transactionId: string) {
    setError(null)
    try {
      await removeTransaction({
        transactionId: transactionId as Id<'transactions'>,
      })
      closeSheet()
      return true
    } catch (caught) {
      setError(
        mutationErrorMessage(
          caught,
          'Unable to delete transaction. Try again.',
        ),
      )
      console.error('Unable to delete transaction', caught)
      return false
    }
  }

  return {
    sheet,
    error,
    openSheet,
    closeSheet,
    saveTransaction,
    deleteTransaction,
    resolveAccountId,
    autoSaveRateForSource,
  }
}
