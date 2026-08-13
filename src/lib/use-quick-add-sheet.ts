import { useMutation } from 'convex/react'
import { useCallback, useState } from 'react'

import { api } from '../../convex/_generated/api'

import type { Id } from '../../convex/_generated/dataModel'
import type { Account, QuickAddInitial, QuickAddPayload } from '#/lib/app-data'

interface QuickAddSheetOptions {
  accounts: Account[]
  incomeSources: { id: string; name: string }[]
  incomePlans: { sourceName: string; savingsRate: number }[]
  defaultSavingsRate: number
  defaultExpenseAccountId: string
}

export function mutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

export function useQuickAddSheet({
  accounts,
  incomeSources,
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

  const autoSaveRateForPayee = useCallback(
    (payee: string) => {
      const normalizedPayee = payee.trim().toLowerCase()
      if (!normalizedPayee) return defaultSavingsRate
      const plan = incomePlans.find((candidate) => {
        const sourceName = candidate.sourceName.toLowerCase()
        return (
          normalizedPayee === sourceName ||
          normalizedPayee.includes(sourceName) ||
          sourceName.includes(normalizedPayee)
        )
      })
      return plan?.savingsRate ?? defaultSavingsRate
    },
    [incomePlans, defaultSavingsRate],
  )

  const resolveIncomeSourceId = useCallback(
    (payload: QuickAddPayload): Id<'incomeSources'> | undefined => {
      if (payload.sourceId) return payload.sourceId as Id<'incomeSources'>
      if (payload.type !== 'income') return undefined

      const payee = payload.payee.trim().toLowerCase()
      if (!payee) return undefined

      const match = incomeSources.find((source) => {
        const name = source.name.toLowerCase()
        return payee === name || payee.includes(name) || name.includes(payee)
      })

      return match?.id as Id<'incomeSources'> | undefined
    },
    [incomeSources],
  )

  function openSheet(initial: QuickAddInitial) {
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
    setError(null)
    setSheet((current) => ({ ...current, open: false }))
  }

  async function saveTransaction(payload: QuickAddPayload) {
    setError(null)
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
    } catch (caught) {
      setError(
        mutationErrorMessage(
          caught,
          'Unable to save transaction. Check the details and try again.',
        ),
      )
      console.error('Unable to save transaction', caught)
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
    autoSaveRateForPayee,
  }
}
