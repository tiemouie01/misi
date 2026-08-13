import {
  DEFAULT_CATEGORIES,
  resolveCategoryColor,
  resolveCategoryIcon,
} from './categories'

import type { Account } from './app-data'
import { CATEGORY_BUDGET_GROUP_LABELS } from '../../shared/category-defs'

export const DEFAULT_USD_RATE = 1735

export const ONBOARDING_STEPS = [
  'welcome',
  'payday',
  'accounts',
  'income',
  'budgets',
  'review',
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export interface AccountPreset {
  name: string
  kind: Account['kind']
  currency: Account['currency']
}

export const ACCOUNT_PRESETS: AccountPreset[] = [
  { name: 'NBS Bank', kind: 'bank', currency: 'MWK' },
  { name: 'FDH Bank', kind: 'bank', currency: 'MWK' },
  { name: 'National Bank', kind: 'bank', currency: 'MWK' },
  { name: 'Standard Bank', kind: 'bank', currency: 'MWK' },
  { name: 'First Capital Bank', kind: 'bank', currency: 'MWK' },
  { name: 'Airtel Money', kind: 'mobile', currency: 'MWK' },
  { name: 'TNM Mpamba', kind: 'mobile', currency: 'MWK' },
  { name: 'Cash', kind: 'cash', currency: 'MWK' },
  { name: 'Unit Trust', kind: 'investment', currency: 'MWK' },
  { name: 'USD Account', kind: 'investment', currency: 'USD' },
]

export const ACCOUNT_KIND_LABELS: Record<Account['kind'], string> = {
  bank: 'Bank',
  mobile: 'Mobile money',
  cash: 'Cash',
  investment: 'Investment',
}

export interface DraftAccount {
  key: string
  name: string
  kind: Account['kind']
  currency: Account['currency']
  balance: string
  isPreset: boolean
  includeInSpendable: boolean
}

export interface DraftIncomeSource {
  key: string
  name: string
  expectedDayStart: string
  expectedDayEnd: string
  expectedAmount: string
  expectedAmountMax: string
  savingsRate: string
  isAnchor: boolean
}

export interface DraftBudget {
  categoryId: string
  plannedAmount: string
}

export interface OnboardingDraft {
  usdRate: string
  defaultSavingsRate: string
  paydayDay: number
  savingsOpeningBalance: string
  spendingLimit: string
  accounts: DraftAccount[]
  incomeSources: DraftIncomeSource[]
  budgets: DraftBudget[]
}

export const BUDGETABLE_CATEGORIES = DEFAULT_CATEGORIES.filter(
  (category) => !category.isSystem,
).map((category) => ({
  id: category.key,
  name: category.name,
  icon: resolveCategoryIcon(category.icon),
  color: resolveCategoryColor(category.color),
  budgetGroup: category.budgetGroup,
}))

export const BUDGET_GROUP_LABELS = CATEGORY_BUDGET_GROUP_LABELS

export const BUDGET_SUGGESTIONS: Record<string, string> = {
  groceries: '220,000',
  transport: '90,000',
  'eating-out': '60,000',
  airtime: '30,000',
  utilities: '80,000',
}

export function newKey() {
  return crypto.randomUUID()
}

export function parseAmount(value: string): number {
  const parsed = Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

/** Format a numeric amount string with thousand separators while typing. */
export function formatAmountInput(value: string): string {
  const cleaned = value.replace(/,/g, '').replace(/[^\d.]/g, '')
  if (cleaned === '') return ''

  const dot = cleaned.indexOf('.')
  const intRaw = dot === -1 ? cleaned : cleaned.slice(0, dot)
  const decRaw = dot === -1 ? null : cleaned.slice(dot + 1).replace(/\./g, '')
  const formattedInt = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  if (decRaw !== null) {
    return `${formattedInt}.${decRaw}`
  }
  return formattedInt
}

export function isValidAmount(value: string): boolean {
  if (value.trim() === '') return true
  const parsed = Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) && parsed >= 0
}

export function validateStep(
  step: OnboardingStep,
  draft: OnboardingDraft,
): string | null {
  if (step === 'welcome') {
    if (parseAmount(draft.usdRate) <= 0 || !isValidAmount(draft.usdRate)) {
      return 'Enter a valid USD rate'
    }
    const defaultSavingsRate = Number(draft.defaultSavingsRate) / 100
    if (
      !Number.isFinite(defaultSavingsRate) ||
      defaultSavingsRate < 0 ||
      defaultSavingsRate > 1 ||
      draft.defaultSavingsRate.trim() === ''
    ) {
      return 'Default savings rate must be between 0% and 100%'
    }
    if (!isValidAmount(draft.savingsOpeningBalance)) {
      return 'Savings balance must be a valid amount'
    }
  }
  if (step === 'accounts') {
    if (draft.accounts.length === 0) return 'Add at least one account'
    const names = new Set<string>()
    for (const account of draft.accounts) {
      const name = account.name.trim()
      if (!name) return 'Every account needs a name'
      const key = name.toLowerCase()
      if (names.has(key)) return `Duplicate account: ${name}`
      names.add(key)
      if (!isValidAmount(account.balance)) {
        return `Enter a valid balance for ${name}`
      }
    }
  }
  if (step === 'income') {
    const names = new Set<string>()
    for (const source of draft.incomeSources) {
      const name = source.name.trim()
      if (!name) return 'Every income source needs a name'
      const key = name.toLowerCase()
      if (names.has(key)) return `Duplicate income source: ${name}`
      names.add(key)
      const dayStart = Number(source.expectedDayStart)
      const dayEnd = Number(source.expectedDayEnd)
      if (
        !Number.isInteger(dayStart) ||
        dayStart < 1 ||
        dayStart > 31 ||
        !Number.isInteger(dayEnd) ||
        dayEnd < dayStart ||
        dayEnd > 31
      ) {
        return `Choose a valid landing window for ${source.name}`
      }
      if (
        source.expectedAmount.trim() === '' ||
        !isValidAmount(source.expectedAmount) ||
        parseAmount(source.expectedAmount) <= 0
      ) {
        return `Enter an expected amount for ${source.name}`
      }
      if (
        !isValidAmount(source.expectedAmountMax) ||
        (source.expectedAmountMax.trim() !== '' &&
          parseAmount(source.expectedAmountMax) <
            parseAmount(source.expectedAmount))
      ) {
        return `The high end for ${source.name} must be at least its expected amount`
      }
      const savingsRate = Number(source.savingsRate) / 100
      if (
        !Number.isFinite(savingsRate) ||
        savingsRate < 0 ||
        savingsRate > 1 ||
        source.savingsRate.trim() === ''
      ) {
        return `Savings rate for ${source.name} must be between 0% and 100%`
      }
    }
  }
  if (step === 'budgets') {
    if (
      draft.spendingLimit.trim() === '' ||
      !isValidAmount(draft.spendingLimit)
    ) {
      return 'Enter a valid spending limit'
    }
    for (const budget of draft.budgets) {
      if (!isValidAmount(budget.plannedAmount)) {
        return 'Category plans must be valid amounts'
      }
    }
    const categoryTotal = draft.budgets.reduce(
      (sum, budget) => sum + parseAmount(budget.plannedAmount),
      0,
    )
    const spendingLimit = parseAmount(draft.spendingLimit)
    if (categoryTotal > spendingLimit) {
      return 'Category plans cannot exceed the spending limit'
    }
  }
  return null
}

export function firstIncompleteStep(draft: OnboardingDraft): OnboardingStep {
  for (const step of ONBOARDING_STEPS) {
    const message = validateStep(step, draft)
    if (message !== null) return step
  }
  return 'review'
}

export function defaultDraft(): OnboardingDraft {
  const suggestedSpendingLimit = BUDGETABLE_CATEGORIES.reduce(
    (sum, category) => sum + parseAmount(BUDGET_SUGGESTIONS[category.id] ?? ''),
    0,
  )

  return {
    usdRate: formatAmountInput(String(DEFAULT_USD_RATE)),
    defaultSavingsRate: '20',
    paydayDay: 20,
    savingsOpeningBalance: '',
    spendingLimit: formatAmountInput(String(suggestedSpendingLimit)),
    accounts: [
      {
        key: newKey(),
        name: 'Cash',
        kind: 'cash',
        currency: 'MWK',
        balance: '',
        isPreset: true,
        includeInSpendable: true,
      },
    ],
    incomeSources: [],
    budgets: BUDGETABLE_CATEGORIES.map((category) => ({
      categoryId: category.id,
      plannedAmount: BUDGET_SUGGESTIONS[category.id] ?? '',
    })),
  }
}

const ACCOUNT_KINDS = new Set<Account['kind']>([
  'bank',
  'mobile',
  'cash',
  'investment',
])

const ACCOUNT_CURRENCIES = new Set<Account['currency']>(['MWK', 'USD'])

function isPresetAccountName(name: string): boolean {
  return ACCOUNT_PRESETS.some(
    (preset) => preset.name.toLowerCase() === name.toLowerCase(),
  )
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function parseDraftAccount(raw: unknown): DraftAccount | null {
  if (!raw || typeof raw !== 'object') return null
  const account = raw as Record<string, unknown>
  if (typeof account.key !== 'string') return null
  if (typeof account.name !== 'string') return null
  if (
    typeof account.kind !== 'string' ||
    !ACCOUNT_KINDS.has(account.kind as Account['kind'])
  ) {
    return null
  }
  if (
    typeof account.currency !== 'string' ||
    !ACCOUNT_CURRENCIES.has(account.currency as Account['currency'])
  ) {
    return null
  }
  if (typeof account.balance !== 'string') return null
  const isPreset =
    typeof account.isPreset === 'boolean'
      ? account.isPreset
      : isPresetAccountName(account.name)
  const kind = account.kind as Account['kind']
  const includeInSpendable =
    typeof account.includeInSpendable === 'boolean'
      ? account.includeInSpendable
      : kind !== 'investment'
  return {
    key: account.key,
    name: account.name,
    kind,
    currency: account.currency as Account['currency'],
    balance: account.balance,
    isPreset,
    includeInSpendable,
  }
}

function parseDraftIncomeSource(raw: unknown): DraftIncomeSource | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  if (typeof source.key !== 'string') return null
  if (typeof source.name !== 'string') return null
  if (typeof source.expectedDayStart !== 'string') return null
  if (typeof source.expectedDayEnd !== 'string') return null
  if (typeof source.expectedAmount !== 'string') return null
  if (typeof source.expectedAmountMax !== 'string') return null
  if (typeof source.savingsRate !== 'string') return null
  if (typeof source.isAnchor !== 'boolean') return null
  return {
    key: source.key,
    name: source.name,
    expectedDayStart: source.expectedDayStart,
    expectedDayEnd: source.expectedDayEnd,
    expectedAmount: source.expectedAmount,
    expectedAmountMax: source.expectedAmountMax,
    savingsRate: source.savingsRate,
    isAnchor: source.isAnchor,
  }
}

function parseDraftBudget(raw: unknown): DraftBudget | null {
  if (!raw || typeof raw !== 'object') return null
  const budget = raw as Record<string, unknown>
  if (typeof budget.categoryId !== 'string') return null
  if (typeof budget.plannedAmount !== 'string') return null
  return {
    categoryId: budget.categoryId,
    plannedAmount: budget.plannedAmount,
  }
}

function parseOnboardingDraft(raw: unknown): OnboardingDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const draft = raw as Record<string, unknown>
  if (typeof draft.usdRate !== 'string') return null
  if (typeof draft.defaultSavingsRate !== 'string') return null
  if (typeof draft.paydayDay !== 'number') return null
  if (typeof draft.savingsOpeningBalance !== 'string') return null
  if (typeof draft.spendingLimit !== 'string') return null
  if (!Array.isArray(draft.accounts)) return null
  if (!Array.isArray(draft.incomeSources)) return null
  if (!Array.isArray(draft.budgets)) return null

  const accounts = draft.accounts
    .map(parseDraftAccount)
    .filter((account): account is DraftAccount => account !== null)
  if (accounts.length !== draft.accounts.length) return null

  const incomeSources = draft.incomeSources
    .map(parseDraftIncomeSource)
    .filter((source): source is DraftIncomeSource => source !== null)
  if (incomeSources.length !== draft.incomeSources.length) return null

  const budgets = draft.budgets
    .map(parseDraftBudget)
    .filter((budget): budget is DraftBudget => budget !== null)
  if (budgets.length !== draft.budgets.length) return null

  return {
    usdRate: draft.usdRate,
    defaultSavingsRate: draft.defaultSavingsRate,
    paydayDay: draft.paydayDay,
    savingsOpeningBalance: draft.savingsOpeningBalance,
    spendingLimit: draft.spendingLimit,
    accounts,
    incomeSources,
    budgets,
  }
}

export function draftStorageKey(userKey: string): string {
  return `misi:onboarding-draft:${userKey}`
}

export function loadDraft(userKey: string): OnboardingDraft | null {
  const storage = getSessionStorage()
  if (!storage) return null
  const raw = storage.getItem(draftStorageKey(userKey))
  if (raw === null) return null
  try {
    return parseOnboardingDraft(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveDraft(userKey: string, draft: OnboardingDraft): void {
  const storage = getSessionStorage()
  if (!storage) return
  storage.setItem(draftStorageKey(userKey), JSON.stringify(draft))
}

export function clearDraft(userKey: string): void {
  const storage = getSessionStorage()
  if (!storage) return
  storage.removeItem(draftStorageKey(userKey))
}
