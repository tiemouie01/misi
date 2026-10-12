import { formatK } from '#/lib/app-data'
import { BUDGETABLE_CATEGORIES, parseAmount } from '#/lib/onboarding-data'

import type {
  IncomeSourceIssue,
  OnboardingDraft,
  OnboardingStep,
} from '#/lib/onboarding-data'

export type OnboardingDraftUpdater = (
  updater: (draft: OnboardingDraft) => OnboardingDraft,
) => void

export function ordinal(day: number) {
  if (day >= 11 && day <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

export function formatExpectedWindow(
  expectedDayStart: string,
  expectedDayEnd: string,
): string {
  const fromDay = Number(expectedDayStart)
  if (!Number.isInteger(fromDay) || fromDay < 1 || fromDay > 31) return ''
  const toDay = Number(expectedDayEnd || expectedDayStart)
  if (!Number.isInteger(toDay) || toDay < fromDay || toDay > 31) {
    return ordinal(fromDay)
  }
  return toDay === fromDay
    ? ordinal(fromDay)
    : `${ordinal(fromDay)}–${ordinal(toDay)}`
}

export const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, index) => index + 1)

export const SAVINGS_RATE_STEP = 5

export function clampSavingsRatePct(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

/** Stable id for an income-source field, used to locate validation issues. */
export function incomeFieldId(
  sourceKey: string,
  field: IncomeSourceIssue['field'],
): string {
  return `ob-income-${field}-${sourceKey}`
}

export interface BudgetTotals {
  categoryTotal: number
  spendingLimit: number
  unallocated: number
  overallocated: number
}

export function budgetTotals(draft: OnboardingDraft): BudgetTotals {
  const categoryTotal = draft.budgets.reduce(
    (sum, budget) => sum + parseAmount(budget.plannedAmount),
    0,
  )
  const spendingLimit = parseAmount(draft.spendingLimit)
  const unallocated = Math.max(spendingLimit - categoryTotal, 0)
  const overallocated = Math.max(categoryTotal - spendingLimit, 0)
  return { categoryTotal, spendingLimit, unallocated, overallocated }
}

export interface ReviewSection {
  title: string
  step: OnboardingStep
  rows: [string, string][]
}

export function buildReviewSections(draft: OnboardingDraft): ReviewSection[] {
  const { spendingLimit, unallocated, overallocated } = budgetTotals(draft)
  const activeBudgets = draft.budgets.filter(
    (budget) => parseAmount(budget.plannedAmount) > 0,
  )

  return [
    {
      title: 'Basics',
      step: 'welcome',
      rows: [
        ['USD rate', `K${draft.usdRate || '—'} per $1`],
        [
          'Default savings rate',
          `${draft.defaultSavingsRate || '0'}% for new sources`,
        ],
        [
          'Savings balance',
          draft.savingsOpeningBalance
            ? formatK(parseAmount(draft.savingsOpeningBalance))
            : 'K0',
        ],
      ],
    },
    {
      title: 'Payday',
      step: 'payday',
      rows: [['Cycle anchor', `${ordinal(draft.paydayDay)} of the month`]],
    },
    {
      title: 'Accounts',
      step: 'accounts',
      rows: draft.accounts.map((account) => [
        account.name,
        account.currency === 'USD'
          ? `$${parseAmount(account.balance).toLocaleString('en-US')}`
          : formatK(parseAmount(account.balance)),
      ]),
    },
    {
      title: 'Income',
      step: 'income',
      rows:
        draft.incomeSources.length > 0
          ? draft.incomeSources.map((source) => [
              source.name,
              `${formatK(parseAmount(source.expectedAmount))}${source.expectedAmountMax ? `–${formatK(parseAmount(source.expectedAmountMax))}` : ''} · ${formatExpectedWindow(source.expectedDayStart, source.expectedDayEnd) || '—'}`,
            ])
          : [['None added', 'You can add income sources later']],
    },
    {
      title: 'Budgets',
      step: 'budgets',
      rows: [
        [
          'Spending limit per cycle',
          draft.spendingLimit.trim() === ''
            ? 'Not set'
            : formatK(spendingLimit),
        ],
        [
          overallocated > 0 ? 'Overallocated' : 'Unallocated',
          formatK(overallocated || unallocated),
        ],
        ...activeBudgets.map((budget): [string, string] => {
          const category = BUDGETABLE_CATEGORIES.find(
            (item) => item.id === budget.categoryId,
          )
          return [
            category?.name ?? budget.categoryId,
            formatK(parseAmount(budget.plannedAmount)),
          ]
        }),
      ],
    },
  ]
}
