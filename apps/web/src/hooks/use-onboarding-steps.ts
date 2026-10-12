import { useState } from 'react'

import {
  SAVINGS_RATE_STEP,
  budgetTotals,
  clampSavingsRatePct,
  formatExpectedWindow,
  incomeFieldId,
} from '#/hooks/onboarding-step-helpers'
import {
  formatAmountInput,
  newKey,
  validateIncomeSources,
} from '#/lib/onboarding-data'

import type { OnboardingDraftUpdater } from '#/hooks/onboarding-step-helpers'
import type { Account } from '#/lib/app-data'
import type {
  AccountPreset,
  DraftAccount,
  DraftIncomeSource,
  OnboardingDraft,
} from '#/lib/onboarding-data'

/** Day-of-month range picker: pick a start day, then an end day. */
export function useExpectedWindowPicker({
  expectedDayStart,
  expectedDayEnd,
  onChange,
}: {
  expectedDayStart: string
  expectedDayEnd: string
  onChange: (expectedDayStart: string, expectedDayEnd: string) => void
}) {
  const [open, setOpenState] = useState(false)
  // Start day picked in this session while waiting for the end day.
  const [pendingStart, setPendingStart] = useState<number | null>(null)
  const value = formatExpectedWindow(expectedDayStart, expectedDayEnd)
  const start = Number(expectedDayStart)
  const end = Number(expectedDayEnd || expectedDayStart)

  function pickDay(day: number) {
    if (pendingStart === null) {
      setPendingStart(day)
      onChange(String(day), String(day))
      return
    }
    const from = Math.min(pendingStart, day)
    const to = Math.max(pendingStart, day)
    onChange(String(from), String(to))
    setPendingStart(null)
    setOpenState(false)
  }

  function setOpen(next: boolean) {
    setOpenState(next)
    setPendingStart(null)
  }

  function dayState(day: number) {
    const inWindow =
      pendingStart === null ? day >= start && day <= end : day === pendingStart
    const isEdge =
      inWindow && (day === start || day === end || pendingStart !== null)
    return { inWindow, isEdge }
  }

  function clear() {
    onChange('', '')
    setPendingStart(null)
  }

  function done() {
    setOpenState(false)
    setPendingStart(null)
  }

  return { open, setOpen, pendingStart, value, dayState, pickDay, clear, done }
}

/** Savings-rate percent input with ±5% steps, clamped to 0–100. */
export function useSavingsRateStepper(
  value: string,
  onChange: (next: string) => void,
) {
  const numeric = Number(value)
  const current = Number.isFinite(numeric) ? numeric : 0

  function stepBy(delta: number) {
    onChange(String(clampSavingsRatePct(current + delta)))
  }

  function setFromText(text: string) {
    const next = text.replace(/[^\d]/g, '')
    if (next === '') {
      onChange('')
      return
    }
    onChange(String(clampSavingsRatePct(Number(next))))
  }

  return {
    canDecrease: current > 0,
    canIncrease: current < 100,
    decrease: () => stepBy(-SAVINGS_RATE_STEP),
    increase: () => stepBy(SAVINGS_RATE_STEP),
    setFromText,
  }
}

export function useWelcomeStep(setDraft: OnboardingDraftUpdater) {
  return {
    setUsdRate: (value: string) =>
      setDraft((current) => ({
        ...current,
        usdRate: formatAmountInput(value),
      })),
    setDefaultSavingsRate: (value: string) =>
      setDraft((current) => ({
        ...current,
        defaultSavingsRate: value.replace(/[^\d]/g, ''),
      })),
    setSavingsOpeningBalance: (value: string) =>
      setDraft((current) => ({
        ...current,
        savingsOpeningBalance: formatAmountInput(value),
      })),
  }
}

export function usePaydayStep(setDraft: OnboardingDraftUpdater) {
  return {
    setPaydayDay: (value: string) =>
      setDraft((current) => ({
        ...current,
        paydayDay: Number(value),
      })),
  }
}

export function useAccountsStep(
  draft: OnboardingDraft,
  setDraft: OnboardingDraftUpdater,
) {
  const isPresetSelected = (presetName: string) =>
    draft.accounts.some(
      (account) =>
        account.isPreset &&
        account.name.toLowerCase() === presetName.toLowerCase(),
    )

  function togglePreset(preset: AccountPreset) {
    setDraft((current) => {
      const selected = current.accounts.some(
        (account) =>
          account.isPreset &&
          account.name.toLowerCase() === preset.name.toLowerCase(),
      )
      if (selected) {
        return {
          ...current,
          accounts: current.accounts.filter(
            (account) =>
              !(
                account.isPreset &&
                account.name.toLowerCase() === preset.name.toLowerCase()
              ),
          ),
        }
      }
      return {
        ...current,
        accounts: [
          ...current.accounts,
          {
            key: newKey(),
            name: preset.name,
            kind: preset.kind,
            currency: preset.currency,
            balance: '',
            isPreset: true,
            includeInSpendable: preset.kind !== 'investment',
          },
        ],
      }
    })
  }

  function updateAccount(key: string, patch: Partial<DraftAccount>) {
    setDraft((current) => ({
      ...current,
      accounts: current.accounts.map((account) =>
        account.key === key ? { ...account, ...patch } : account,
      ),
    }))
  }

  function setAccountKind(key: string, kind: Account['kind']) {
    updateAccount(key, {
      kind,
      includeInSpendable: kind !== 'investment',
    })
  }

  function setAccountBalance(key: string, value: string) {
    updateAccount(key, { balance: formatAmountInput(value) })
  }

  function removeAccount(key: string) {
    setDraft((current) => ({
      ...current,
      accounts: current.accounts.filter((item) => item.key !== key),
    }))
  }

  function addAccount() {
    setDraft((current) => ({
      ...current,
      accounts: [
        ...current.accounts,
        {
          key: newKey(),
          name: '',
          kind: 'bank',
          currency: 'MWK',
          balance: '',
          isPreset: false,
          includeInSpendable: true,
        },
      ],
    }))
  }

  return {
    isPresetSelected,
    togglePreset,
    updateAccount,
    setAccountKind,
    setAccountBalance,
    removeAccount,
    addAccount,
  }
}

export function useIncomeStep(
  draft: OnboardingDraft,
  setDraft: OnboardingDraftUpdater,
  error: string | null | undefined,
) {
  const issue = error ? validateIncomeSources(draft) : null
  const invalid = issue?.message === error ? issue : null
  // Field id of the source field the current error points at, if any.
  const invalidId = invalid
    ? incomeFieldId(invalid.sourceKey, invalid.field)
    : null

  function updateSource(key: string, patch: Partial<DraftIncomeSource>) {
    setDraft((current) => ({
      ...current,
      incomeSources: current.incomeSources.map((source) =>
        source.key === key ? { ...source, ...patch } : source,
      ),
    }))
  }

  function setExpectedAmount(key: string, value: string) {
    updateSource(key, { expectedAmount: formatAmountInput(value) })
  }

  function setExpectedAmountMax(key: string, value: string) {
    updateSource(key, { expectedAmountMax: formatAmountInput(value) })
  }

  function removeSource(key: string) {
    setDraft((current) => ({
      ...current,
      incomeSources: current.incomeSources.filter((item) => item.key !== key),
    }))
  }

  function setAnchor(key: string) {
    setDraft((current) => ({
      ...current,
      incomeSources: current.incomeSources.map((item) => ({
        ...item,
        isAnchor: item.key === key,
      })),
    }))
  }

  function addSource() {
    setDraft((current) => ({
      ...current,
      incomeSources: [
        ...current.incomeSources,
        {
          key: newKey(),
          name: '',
          expectedDayStart: '',
          expectedDayEnd: '',
          expectedAmount: '',
          expectedAmountMax: '',
          savingsRate: current.defaultSavingsRate,
          isAnchor: current.incomeSources.length === 0,
        },
      ],
    }))
  }

  return {
    invalidId,
    updateSource,
    setExpectedAmount,
    setExpectedAmountMax,
    removeSource,
    setAnchor,
    addSource,
  }
}

export function useBudgetsStep(
  draft: OnboardingDraft,
  setDraft: OnboardingDraftUpdater,
) {
  const totals = budgetTotals(draft)

  function setSpendingLimit(value: string) {
    setDraft((current) => ({
      ...current,
      spendingLimit: formatAmountInput(value),
    }))
  }

  function updatePlannedAmount(categoryId: string, value: string) {
    setDraft((current) => ({
      ...current,
      budgets: current.budgets.map((item) =>
        item.categoryId === categoryId
          ? { ...item, plannedAmount: formatAmountInput(value) }
          : item,
      ),
    }))
  }

  function plannedAmountFor(categoryId: string): string {
    const budget = draft.budgets.find((item) => item.categoryId === categoryId)
    return budget?.plannedAmount ?? ''
  }

  return { ...totals, setSpendingLimit, updatePlannedAmount, plannedAmountFor }
}
