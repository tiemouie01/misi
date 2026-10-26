import { CalendarIcon, Minus, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AccountDraftFields } from '#/components/account-draft-fields'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { formatK } from '#/lib/app-data'
import {
  ACCOUNT_PRESETS,
  BUDGETABLE_CATEGORIES,
  BUDGET_GROUP_LABELS,
  formatAmountInput,
  newDraftAccount,
  newKey,
  parseAmount,
  validateIncomeSources,
} from '#/lib/onboarding-data'
import { cn, ordinal } from '#/lib/utils'

import type {
  DraftAccount,
  IncomeSourceIssue,
  OnboardingDraft,
  OnboardingStep,
} from '#/lib/onboarding-data'
import type { BudgetGroup } from '../../../shared/category-defs'

export interface StepProps {
  draft: OnboardingDraft
  setDraft: (updater: (draft: OnboardingDraft) => OnboardingDraft) => void
  goToStep: (step: OnboardingStep) => void
  error?: string | null
}

function formatExpectedWindow(
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

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, index) => index + 1)

function ExpectedWindowPicker({
  expectedDayStart,
  expectedDayEnd,
  onChange,
  id,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: {
  expectedDayStart: string
  expectedDayEnd: string
  onChange: (expectedDayStart: string, expectedDayEnd: string) => void
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  const [open, setOpen] = useState(false)
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
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setPendingStart(null)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            'h-10 w-full justify-start rounded-xl px-3 text-left text-sm font-normal shadow-sm',
            !value && 'text-sea-ink-soft/70',
          )}
          aria-label="Days this money comes"
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" />
          <span className="truncate">{value || 'Pick days'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(20rem,calc(100vw-2rem))] p-3"
        side="bottom"
        align="start"
        collisionPadding={16}
      >
        <div
          role="group"
          aria-label="Day of the month"
          className="grid grid-cols-7 gap-1"
        >
          {DAYS_OF_MONTH.map((day) => {
            const inWindow =
              pendingStart === null
                ? day >= start && day <= end
                : day === pendingStart
            const isEdge =
              inWindow &&
              (day === start || day === end || pendingStart !== null)
            return (
              <Button
                key={day}
                type="button"
                variant="ghost"
                aria-label={ordinal(day)}
                aria-pressed={inWindow}
                className={cn(
                  'h-10 w-full rounded-lg p-0 text-sm font-semibold text-sea-ink tabular-nums sm:h-9',
                  inWindow && 'bg-lagoon/15 hover:bg-lagoon/25',
                  isEdge &&
                    'bg-lagoon text-(--btn-text) hover:bg-lagoon-deep hover:text-(--btn-text)',
                )}
                onClick={() => pickDay(day)}
              >
                {day}
              </Button>
            )
          })}
        </div>
        <p className="mt-3 text-[0.75rem] text-sea-ink-soft">
          Days of the month this money usually comes
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-(--line) pt-2">
          <p
            aria-live="polite"
            className="min-w-0 truncate text-[0.8rem] font-semibold text-sea-ink"
          >
            {pendingStart === null
              ? value || 'Tap a start day'
              : `From the ${ordinal(pendingStart)}: tap an end day`}
          </p>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="max-sm:h-10"
              disabled={!value}
              onClick={() => {
                onChange('', '')
                setPendingStart(null)
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              className="hover:translate-y-0 max-sm:h-10"
              onClick={() => {
                setOpen(false)
                setPendingStart(null)
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const SAVINGS_RATE_STEP = 5

function clampSavingsRatePct(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function SavingsRateStepper({
  id,
  value,
  onChange,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  const numeric = Number(value)
  const current = Number.isFinite(numeric) ? numeric : 0

  function stepBy(delta: number) {
    onChange(String(clampSavingsRatePct(current + delta)))
  }

  return (
    <div className="flex h-10 items-stretch overflow-hidden rounded-xl border border-(--chip-line) bg-(--chip-bg) shadow-sm focus-within:border-lagoon-deep focus-within:ring-2 focus-within:ring-lagoon/25">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 rounded-none text-sea-ink-soft hover:bg-(--link-bg-hover) hover:text-sea-ink"
        aria-label="Decrease savings rate by 5%"
        disabled={current <= 0}
        onClick={() => stepBy(-SAVINGS_RATE_STEP)}
      >
        <Minus className="size-4" />
      </Button>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="20"
        value={value}
        aria-label="Savings rate percent"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-1 text-center shadow-none focus-visible:border-transparent focus-visible:ring-0"
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d]/g, '')
          if (next === '') {
            onChange('')
            return
          }
          onChange(String(clampSavingsRatePct(Number(next))))
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 rounded-none text-sea-ink-soft hover:bg-(--link-bg-hover) hover:text-sea-ink"
        aria-label="Increase savings rate by 5%"
        disabled={current >= 100}
        onClick={() => stepBy(SAVINGS_RATE_STEP)}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  )
}

export function WelcomeStep({ draft, setDraft, error }: StepProps) {
  const invalid = Boolean(error)

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="ob-usd-rate">USD rate (K per $1)</Label>
        <Input
          id="ob-usd-rate"
          className="mt-2"
          inputMode="numeric"
          value={draft.usdRate}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? 'onboarding-error' : undefined}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              usdRate: formatAmountInput(event.target.value),
            }))
          }
        />
        <p className="mt-1.5 text-[0.8rem] text-sea-ink-soft">
          Used to count your dollar accounts in kwacha.
        </p>
      </div>
      <div>
        <Label htmlFor="ob-default-savings-rate">
          Savings rate (% of income)
        </Label>
        <Input
          id="ob-default-savings-rate"
          className="mt-2"
          inputMode="numeric"
          value={draft.defaultSavingsRate}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? 'onboarding-error' : undefined}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              defaultSavingsRate: event.target.value.replace(/[^\d]/g, ''),
            }))
          }
        />
        <p className="mt-1.5 text-[0.8rem] text-sea-ink-soft">
          How much of each pay to put aside. Each income can have its own rate.
        </p>
      </div>
      <div>
        <Label htmlFor="ob-savings-balance">
          Money in Savings now (optional)
        </Label>
        <Input
          id="ob-savings-balance"
          className="mt-2"
          inputMode="numeric"
          placeholder="0"
          value={draft.savingsOpeningBalance}
          aria-invalid={invalid || undefined}
          aria-describedby={
            invalid
              ? 'onboarding-error ob-savings-balance-hint'
              : 'ob-savings-balance-hint'
          }
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              savingsOpeningBalance: formatAmountInput(event.target.value),
            }))
          }
        />
        <p
          id="ob-savings-balance-hint"
          className="mt-1.5 text-[0.8rem] text-sea-ink-soft"
        >
          Only what is already in Savings, in kwacha. Leave out bank, investment
          and dollar accounts.
        </p>
      </div>
    </div>
  )
}

export function PaydayStep({ draft, setDraft }: StepProps) {
  return (
    <div>
      <Label htmlFor="ob-payday">Payday each month</Label>
      <Select
        value={String(draft.paydayDay)}
        onValueChange={(value) =>
          setDraft((current) => ({
            ...current,
            paydayDay: Number(value),
          }))
        }
      >
        <SelectTrigger id="ob-payday" className="mt-2 h-12 w-full rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
            <SelectItem key={day} value={String(day)}>
              {ordinal(day)} of the month
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1.5 text-[0.8rem] text-sea-ink-soft">
        Your pay month runs from the {ordinal(draft.paydayDay)} to the day
        before the next {ordinal(draft.paydayDay)}.
      </p>
    </div>
  )
}

export function AccountsStep({ draft, setDraft }: StepProps) {
  const isPresetSelected = (presetName: string) =>
    draft.accounts.some(
      (account) =>
        account.isPreset &&
        account.name.toLowerCase() === presetName.toLowerCase(),
    )

  function togglePreset(preset: (typeof ACCOUNT_PRESETS)[number]) {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ACCOUNT_PRESETS.map((preset) => {
          const selected = isPresetSelected(preset.name)
          return (
            <Button
              key={preset.name}
              type="button"
              variant={selected ? 'default' : 'outline'}
              aria-pressed={selected}
              className="h-11 px-4 hover:translate-y-0"
              onClick={() => togglePreset(preset)}
            >
              {preset.name}
            </Button>
          )
        })}
      </div>
      {draft.accounts.length > 0 && (
        <div className="space-y-3">
          {draft.accounts.map((account) => (
            <AccountDraftFields
              key={account.key}
              account={account}
              onChange={(patch) => updateAccount(account.key, patch)}
              onRemove={
                account.isPreset
                  ? undefined
                  : () =>
                      setDraft((current) => ({
                        ...current,
                        accounts: current.accounts.filter(
                          (item) => item.key !== account.key,
                        ),
                      }))
              }
            />
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() =>
          setDraft((current) => ({
            ...current,
            accounts: [...current.accounts, newDraftAccount()],
          }))
        }
      >
        <Plus className="size-4" />
        Add another account
      </Button>
    </div>
  )
}

export function IncomeStep({ draft, setDraft, error }: StepProps) {
  const issue = error ? validateIncomeSources(draft) : null
  const invalid = issue?.message === error ? issue : null
  const invalidId = invalid
    ? `ob-income-${invalid.field}-${invalid.sourceKey}`
    : null

  useEffect(() => {
    if (!invalidId) return
    const field = document.getElementById(invalidId)
    field?.scrollIntoView({ block: 'center' })
    field?.focus({ preventScroll: true })
  }, [invalidId])

  function fieldA11y(sourceKey: string, field: IncomeSourceIssue['field']) {
    const id = `ob-income-${field}-${sourceKey}`
    return id === invalidId
      ? { id, 'aria-invalid': true, 'aria-describedby': `${id}-error` }
      : { id }
  }

  function fieldError(sourceKey: string, field: IncomeSourceIssue['field']) {
    const id = `ob-income-${field}-${sourceKey}`
    if (id !== invalidId) return null
    return (
      <p
        id={`${id}-error`}
        className="text-[0.8rem] font-semibold text-coral-deep"
      >
        {error}
      </p>
    )
  }

  function updateSource(
    key: string,
    patch: Partial<OnboardingDraft['incomeSources'][number]>,
  ) {
    setDraft((current) => ({
      ...current,
      incomeSources: current.incomeSources.map((source) =>
        source.key === key ? { ...source, ...patch } : source,
      ),
    }))
  }

  return (
    <div className="space-y-4">
      {draft.incomeSources.map((source) => (
        <div
          key={source.key}
          className="space-y-2 rounded-2xl border border-(--line) p-3"
        >
          <div className="flex items-start gap-2">
            <Input
              {...fieldA11y(source.key, 'name')}
              aria-label="Income source name"
              placeholder="e.g. Salary"
              value={source.name}
              onChange={(event) =>
                updateSource(source.key, { name: event.target.value })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove ${source.name || 'income source'}`}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  incomeSources: current.incomeSources.filter(
                    (item) => item.key !== source.key,
                  ),
                }))
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          {fieldError(source.key, 'name')}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`ob-income-window-${source.key}`}>
                Days it comes
              </Label>
              <ExpectedWindowPicker
                {...fieldA11y(source.key, 'window')}
                expectedDayStart={source.expectedDayStart}
                expectedDayEnd={source.expectedDayEnd}
                onChange={(expectedDayStart, expectedDayEnd) =>
                  updateSource(source.key, { expectedDayStart, expectedDayEnd })
                }
              />
              {fieldError(source.key, 'window')}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`ob-income-amount-${source.key}`}>Amount</Label>
              <Input
                {...fieldA11y(source.key, 'amount')}
                inputMode="numeric"
                placeholder="1,850,000"
                value={source.expectedAmount}
                onChange={(event) =>
                  updateSource(source.key, {
                    expectedAmount: formatAmountInput(event.target.value),
                  })
                }
              />
              {fieldError(source.key, 'amount')}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`ob-income-amount-max-${source.key}`}>
                Up to (optional)
              </Label>
              <Input
                {...fieldA11y(source.key, 'amount-max')}
                inputMode="numeric"
                placeholder="If it changes"
                value={source.expectedAmountMax}
                onChange={(event) =>
                  updateSource(source.key, {
                    expectedAmountMax: formatAmountInput(event.target.value),
                  })
                }
              />
              {fieldError(source.key, 'amount-max')}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`ob-income-savings-rate-${source.key}`}>
                Savings rate
              </Label>
              <SavingsRateStepper
                {...fieldA11y(source.key, 'savings-rate')}
                value={source.savingsRate}
                onChange={(savingsRate) =>
                  updateSource(source.key, { savingsRate })
                }
              />
              {fieldError(source.key, 'savings-rate')}
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            aria-pressed={source.isAnchor}
            className="h-auto w-full justify-between rounded-xl px-3 py-2 text-left text-[0.8rem] font-normal whitespace-normal aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon/10 aria-pressed:text-sea-ink"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                incomeSources: current.incomeSources.map((item) => ({
                  ...item,
                  isAnchor: item.key === source.key,
                })),
              }))
            }
          >
            <span>
              <span className="font-semibold">Main pay</span>
              <span className="ml-2">Keeps your pay month in line.</span>
            </span>
            <span className="shrink-0 font-bold">
              {source.isAnchor ? 'Yes' : 'Make main'}
            </span>
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() =>
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
      >
        <Plus className="size-4" />
        Add income
      </Button>
    </div>
  )
}

export function BudgetsStep({ draft, setDraft, error }: StepProps) {
  const categoryTotal = draft.budgets.reduce(
    (sum, budget) => sum + parseAmount(budget.plannedAmount),
    0,
  )
  const spendingLimit = parseAmount(draft.spendingLimit)
  const unallocated = Math.max(spendingLimit - categoryTotal, 0)
  const overallocated = Math.max(categoryTotal - spendingLimit, 0)
  const invalid = Boolean(error)

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

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="ob-spending-limit">Spending limit each pay month</Label>
        <Input
          id="ob-spending-limit"
          className="mt-2"
          inputMode="numeric"
          placeholder="650,000"
          value={draft.spendingLimit}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? 'onboarding-error' : undefined}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              spendingLimit: formatAmountInput(event.target.value),
            }))
          }
        />
        <p className="mt-1.5 text-[0.8rem] text-sea-ink-soft">
          The most you plan to spend from one payday to the next. Savings is not
          part of it.
        </p>
      </div>
      <div
        className={cn(
          'grid grid-cols-3 gap-2 rounded-2xl px-4 py-3',
          overallocated > 0 ? 'bg-coral/10' : 'bg-lagoon-deep/6',
        )}
        aria-live="polite"
      >
        <div>
          <p className="text-[0.7rem] font-bold tracking-wide text-sea-ink-soft uppercase">
            Planned
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-sea-ink tabular-nums">
            {formatK(categoryTotal)}
          </p>
        </div>
        <div>
          <p className="text-[0.7rem] font-bold tracking-wide text-sea-ink-soft uppercase">
            {overallocated > 0 ? 'Too much' : 'Left to plan'}
          </p>
          <p
            className={cn(
              'mt-1 font-mono text-sm font-bold tabular-nums',
              overallocated > 0 ? 'text-coral-deep' : 'text-palm',
            )}
          >
            {formatK(overallocated || unallocated)}
          </p>
        </div>
        <div>
          <p className="text-[0.7rem] font-bold tracking-wide text-sea-ink-soft uppercase">
            Limit
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-sea-ink tabular-nums">
            {formatK(spendingLimit)}
          </p>
        </div>
      </div>

      {overallocated > 0 && (
        <p className="text-[0.8rem] font-semibold text-coral-deep">
          Lower your plans by {formatK(overallocated)} to go on.
        </p>
      )}

      {(['needs', 'wants'] as BudgetGroup[]).map((group) => {
        const categories = BUDGETABLE_CATEGORIES.filter(
          (category) => category.budgetGroup === group,
        )
        if (categories.length === 0) return null
        return (
          <section key={group} className="space-y-2">
            <h2 className="field-label pt-2">{BUDGET_GROUP_LABELS[group]}</h2>
            <div className="space-y-2">
              {categories.map((category) => {
                const budget = draft.budgets.find(
                  (item) => item.categoryId === category.id,
                )
                return (
                  <div key={category.id} className="flex items-center gap-3">
                    <span className="flex flex-1 items-center gap-2 text-[0.9rem] font-semibold text-sea-ink">
                      <category.icon
                        aria-hidden
                        className="size-4"
                        style={{ color: category.color }}
                      />
                      {category.name}
                    </span>
                    <Input
                      aria-label={`${category.name} planned amount`}
                      className="h-11 w-32"
                      inputMode="numeric"
                      placeholder="0"
                      value={budget?.plannedAmount ?? ''}
                      onChange={(event) =>
                        updatePlannedAmount(category.id, event.target.value)
                      }
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function ReviewStep({ draft, goToStep }: StepProps) {
  const categoryTotal = draft.budgets.reduce(
    (sum, budget) => sum + parseAmount(budget.plannedAmount),
    0,
  )
  const spendingLimit = parseAmount(draft.spendingLimit)
  const unallocated = Math.max(spendingLimit - categoryTotal, 0)
  const overallocated = Math.max(categoryTotal - spendingLimit, 0)
  const activeBudgets = draft.budgets.filter(
    (budget) => parseAmount(budget.plannedAmount) > 0,
  )

  const sections: {
    title: string
    step: OnboardingStep
    rows: [string, string][]
  }[] = [
    {
      title: 'Basics',
      step: 'welcome',
      rows: [
        ['USD rate', `K${draft.usdRate || '—'} per $1`],
        ['Savings rate', `${draft.defaultSavingsRate || '0'}% of income`],
        [
          'Money in Savings',
          draft.savingsOpeningBalance
            ? formatK(parseAmount(draft.savingsOpeningBalance))
            : 'K0',
        ],
      ],
    },
    {
      title: 'Payday',
      step: 'payday',
      rows: [['Payday', `${ordinal(draft.paydayDay)} of the month`]],
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
          : [['None added', 'You can add income later']],
    },
    {
      title: 'Budgets',
      step: 'budgets',
      rows: [
        [
          'Spending limit',
          draft.spendingLimit.trim() === ''
            ? 'Not set'
            : formatK(spendingLimit),
        ],
        [
          overallocated > 0 ? 'Too much' : 'Left to plan',
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

  return (
    <div className="divide-y divide-(--line)">
      {sections.map((section) => (
        <section key={section.title} className="py-4 first:pt-0 last:pb-0">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-[0.95rem] font-bold text-sea-ink">
              {section.title}
            </h2>
            <Button
              type="button"
              variant="link"
              className="-my-2 h-10 px-2 text-[0.85rem] font-bold"
              aria-label={`Edit ${section.title}`}
              onClick={() => goToStep(section.step)}
            >
              Edit
            </Button>
          </div>
          <dl className="space-y-1.5">
            {section.rows.map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-3"
              >
                <dt className="text-[0.85rem] text-sea-ink-soft">{label}</dt>
                <dd className="text-right font-mono text-[0.85rem] font-semibold text-sea-ink tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
