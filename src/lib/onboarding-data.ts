import { categories } from './app-data'

import type { Account } from './app-data'

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
  { name: 'NBM Bank', kind: 'bank', currency: 'MWK' },
  { name: 'FDH Bank', kind: 'bank', currency: 'MWK' },
  { name: 'National Bank', kind: 'bank', currency: 'MWK' },
  { name: 'Standard Bank', kind: 'bank', currency: 'MWK' },
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
}

export interface DraftIncomeSource {
  key: string
  name: string
  expected: string
  amountLabel: string
  splitPct: string
}

export interface DraftBudget {
  categoryId: string
  amount: string
}

export interface OnboardingDraft {
  usdRate: string
  autoSavePct: string
  paydayDay: number
  savingsOpeningBalance: string
  totalBudget: string
  accounts: DraftAccount[]
  incomeSources: DraftIncomeSource[]
  budgets: DraftBudget[]
}

export const BUDGETABLE_CATEGORIES = categories.filter(
  (category) => category.id !== 'adjustment',
)

export const BUDGET_SUGGESTIONS: Record<string, string> = {
  groceries: '220000',
  transport: '90000',
  'eating-out': '60000',
  airtime: '30000',
  utilities: '80000',
}

export function newKey() {
  return crypto.randomUUID()
}

export function parseAmount(value: string): number {
  const parsed = Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
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
    const autoSave = Number(draft.autoSavePct)
    if (
      !Number.isFinite(autoSave) ||
      autoSave < 0 ||
      autoSave > 95 ||
      draft.autoSavePct.trim() === ''
    ) {
      return 'Auto-save must be between 0% and 95%'
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
    for (const source of draft.incomeSources) {
      if (!source.name.trim()) return 'Every income source needs a name'
      if (source.splitPct.trim() !== '') {
        const split = Number(source.splitPct)
        if (!Number.isFinite(split) || split < 0 || split > 100) {
          return `Auto-save split for ${source.name} must be between 0% and 100%`
        }
      }
    }
  }
  if (step === 'budgets') {
    if (!isValidAmount(draft.totalBudget)) {
      return 'Enter a valid total budget'
    }
    for (const budget of draft.budgets) {
      if (!isValidAmount(budget.amount)) return 'Budget amounts must be valid'
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
  return {
    usdRate: String(DEFAULT_USD_RATE),
    autoSavePct: '20',
    paydayDay: 20,
    savingsOpeningBalance: '',
    totalBudget: '',
    accounts: [
      {
        key: newKey(),
        name: 'Cash',
        kind: 'cash',
        currency: 'MWK',
        balance: '',
        isPreset: true,
      },
    ],
    incomeSources: [],
    budgets: BUDGETABLE_CATEGORIES.map((category) => ({
      categoryId: category.id,
      amount: BUDGET_SUGGESTIONS[category.id] ?? '',
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
  return {
    key: account.key,
    name: account.name,
    kind: account.kind as Account['kind'],
    currency: account.currency as Account['currency'],
    balance: account.balance,
    isPreset,
  }
}

function parseDraftIncomeSource(raw: unknown): DraftIncomeSource | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  if (typeof source.key !== 'string') return null
  if (typeof source.name !== 'string') return null
  if (typeof source.expected !== 'string') return null
  if (typeof source.amountLabel !== 'string') return null
  if (typeof source.splitPct !== 'string') return null
  return {
    key: source.key,
    name: source.name,
    expected: source.expected,
    amountLabel: source.amountLabel,
    splitPct: source.splitPct,
  }
}

function parseDraftBudget(raw: unknown): DraftBudget | null {
  if (!raw || typeof raw !== 'object') return null
  const budget = raw as Record<string, unknown>
  if (typeof budget.categoryId !== 'string') return null
  if (typeof budget.amount !== 'string') return null
  return {
    categoryId: budget.categoryId,
    amount: budget.amount,
  }
}

function parseOnboardingDraft(raw: unknown): OnboardingDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const draft = raw as Record<string, unknown>
  if (typeof draft.usdRate !== 'string') return null
  if (typeof draft.autoSavePct !== 'string') return null
  if (typeof draft.paydayDay !== 'number') return null
  if (typeof draft.savingsOpeningBalance !== 'string') return null
  if (typeof draft.totalBudget !== 'string') return null
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
    autoSavePct: draft.autoSavePct,
    paydayDay: draft.paydayDay,
    savingsOpeningBalance: draft.savingsOpeningBalance,
    totalBudget: draft.totalBudget,
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
