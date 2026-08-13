import { CalendarIcon, Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
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
import { Switch } from '#/components/ui/switch'
import { formatK } from '#/lib/app-data'
import {
  ACCOUNT_KIND_LABELS,
  ACCOUNT_PRESETS,
  BUDGETABLE_CATEGORIES,
  BUDGET_GROUP_LABELS,
  formatAmountInput,
  newKey,
  parseAmount,
} from '#/lib/onboarding-data'
import { cn } from '#/lib/utils'

import type { Account } from '#/lib/app-data'
import type {
  DraftAccount,
  OnboardingDraft,
  OnboardingStep,
} from '#/lib/onboarding-data'
import type { BudgetGroup } from '../../../shared/category-defs'
import type { DateRange } from 'react-day-picker'

export interface StepProps {
  draft: OnboardingDraft
  setDraft: (updater: (draft: OnboardingDraft) => OnboardingDraft) => void
  goToStep: (step: OnboardingStep) => void
  error?: string | null
}

const accountKinds: Account['kind'][] = ['bank', 'mobile', 'cash', 'investment']

function ordinal(day: number) {
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

function dayInCurrentMonth(day: number) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), day)
}

function parseExpectedWindow(
  expectedDayStart: string,
  expectedDayEnd: string,
): DateRange | undefined {
  const fromDay = Number(expectedDayStart)
  if (!Number.isInteger(fromDay) || fromDay < 1 || fromDay > 31) {
    return undefined
  }
  const toDay = Number(expectedDayEnd || expectedDayStart)
  if (!Number.isInteger(toDay) || toDay < fromDay || toDay > 31) {
    return undefined
  }
  return {
    from: dayInCurrentMonth(fromDay),
    to: dayInCurrentMonth(toDay),
  }
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

function ExpectedWindowPicker({
  expectedDayStart,
  expectedDayEnd,
  onChange,
  id,
}: {
  expectedDayStart: string
  expectedDayEnd: string
  onChange: (expectedDayStart: string, expectedDayEnd: string) => void
  id: string
}) {
  const [open, setOpen] = useState(false)
  const selected = parseExpectedWindow(expectedDayStart, expectedDayEnd)
  const value = formatExpectedWindow(expectedDayStart, expectedDayEnd)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            'h-10 w-full justify-start rounded-xl px-3 text-left text-sm font-normal shadow-sm',
            !value && 'text-sea-ink-soft/70',
          )}
          aria-label="Expected landing window"
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" />
          <span className="truncate">{value || 'Pick days'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selected}
          defaultMonth={selected?.from}
          numberOfMonths={1}
          onSelect={(range) => {
            const fromDay = range?.from?.getDate()
            const toDay = range?.to?.getDate() ?? fromDay
            onChange(
              fromDay === undefined ? '' : String(fromDay),
              toDay === undefined ? '' : String(toDay),
            )
            if (range?.from && range.to) setOpen(false)
          }}
        />
        <p className="border-t border-(--line) px-3 py-2 text-[0.75rem] text-sea-ink-soft">
          Day-of-month landing window each cycle
        </p>
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
}: {
  id: string
  value: string
  onChange: (next: string) => void
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
    <div className="space-y-4">
      <p className="text-[0.9rem] text-sea-ink-soft">
        A few basics and Misi will shape itself around how your money actually
        moves. Everything here can be changed later.
      </p>
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
          Used to fold USD accounts into your net worth.
        </p>
      </div>
      <div>
        <Label htmlFor="ob-default-savings-rate">
          Default savings rate (% of income)
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
          Used as the starting rate for new income sources. Each source can have
          its own rate.
        </p>
      </div>
      <div>
        <Label htmlFor="ob-savings-balance">
          Current savings balance (optional)
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
          Money already set aside in Savings (MWK)—not your total across bank,
          investment, or foreign-currency accounts.
        </p>
      </div>
    </div>
  )
}

export function PaydayStep({ draft, setDraft }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-[0.9rem] text-sea-ink-soft">
        Misi budgets from payday to payday, not calendar months. Pick the day
        your main income lands.
      </p>
      <div>
        <Label htmlFor="ob-payday">Payday</Label>
        <Select
          value={String(draft.paydayDay)}
          onValueChange={(value) =>
            setDraft((current) => ({
              ...current,
              paydayDay: Number(value),
            }))
          }
        >
          <SelectTrigger id="ob-payday" className="mt-2 h-10 w-full rounded-xl">
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
          Your cycle runs from the {ordinal(draft.paydayDay)} to the day before
          the next {ordinal(draft.paydayDay)}.
        </p>
      </div>
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
      <p className="text-[0.9rem] text-sea-ink-soft">
        Where does your money sit right now? Pick accounts and enter today's
        balance for each.
      </p>
      <div className="flex flex-wrap gap-2">
        {ACCOUNT_PRESETS.map((preset) => {
          const selected = isPresetSelected(preset.name)
          return (
            <Button
              key={preset.name}
              type="button"
              variant={selected ? 'default' : 'outline'}
              size="sm"
              aria-pressed={selected}
              className="hover:translate-y-0"
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
            <div
              key={account.key}
              className="space-y-2 rounded-2xl border border-(--line) p-3"
            >
              {!account.isPreset ? (
                <div className="flex items-start gap-2">
                  <Input
                    aria-label="Account name"
                    placeholder="Account name"
                    value={account.name}
                    onChange={(event) =>
                      updateAccount(account.key, { name: event.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${account.name || 'account'}`}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        accounts: current.accounts.filter(
                          (item) => item.key !== account.key,
                        ),
                      }))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-[0.9rem] font-semibold text-sea-ink">
                  {account.name}
                </p>
              )}
              <div className="flex gap-2">
                {!account.isPreset && (
                  <>
                    <Select
                      value={account.kind}
                      onValueChange={(value) =>
                        updateAccount(account.key, {
                          kind: value as Account['kind'],
                          includeInSpendable: value !== 'investment',
                        })
                      }
                    >
                      <SelectTrigger
                        aria-label="Account type"
                        className="h-10 w-auto rounded-xl"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accountKinds.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {ACCOUNT_KIND_LABELS[kind]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={account.currency}
                      onValueChange={(value) =>
                        updateAccount(account.key, {
                          currency: value as Account['currency'],
                        })
                      }
                    >
                      <SelectTrigger
                        aria-label="Currency"
                        className="h-10 w-auto rounded-xl"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MWK">MWK</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                <Input
                  aria-label={`${account.name || 'Account'} balance`}
                  inputMode="numeric"
                  placeholder={
                    account.currency === 'USD' ? 'Balance ($)' : 'Balance (K)'
                  }
                  value={account.balance}
                  onChange={(event) =>
                    updateAccount(account.key, {
                      balance: formatAmountInput(event.target.value),
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3 pt-1">
                <Label
                  htmlFor={`ob-spendable-${account.key}`}
                  className="mb-0 text-sm font-bold normal-case tracking-normal text-sea-ink"
                >
                  Counts toward spendable
                </Label>
                <Switch
                  id={`ob-spendable-${account.key}`}
                  checked={account.includeInSpendable}
                  onCheckedChange={(checked) =>
                    updateAccount(account.key, {
                      includeInSpendable: checked,
                    })
                  }
                />
              </div>
            </div>
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
      >
        <Plus className="size-4" />
        Add another account
      </Button>
    </div>
  )
}

export function IncomeStep({ draft, setDraft }: StepProps) {
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
      <p className="text-[0.9rem] text-sea-ink-soft">
        What money do you expect each cycle? Add a landing window and amount so
        Misi can compare planned income with what actually lands. Skip this if
        you'd rather add it later.
      </p>
      {draft.incomeSources.map((source) => (
        <div
          key={source.key}
          className="space-y-2 rounded-2xl border border-(--line) p-3"
        >
          <div className="flex items-start gap-2">
            <Input
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`ob-income-window-${source.key}`}>
                Landing window
              </Label>
              <ExpectedWindowPicker
                id={`ob-income-window-${source.key}`}
                expectedDayStart={source.expectedDayStart}
                expectedDayEnd={source.expectedDayEnd}
                onChange={(expectedDayStart, expectedDayEnd) =>
                  updateSource(source.key, { expectedDayStart, expectedDayEnd })
                }
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`ob-income-amount-${source.key}`}>
                Expected amount
              </Label>
              <Input
                id={`ob-income-amount-${source.key}`}
                inputMode="numeric"
                placeholder="1,850,000"
                value={source.expectedAmount}
                onChange={(event) =>
                  updateSource(source.key, {
                    expectedAmount: formatAmountInput(event.target.value),
                  })
                }
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`ob-income-amount-max-${source.key}`}>
                High end (optional)
              </Label>
              <Input
                id={`ob-income-amount-max-${source.key}`}
                inputMode="numeric"
                placeholder="For variable income"
                value={source.expectedAmountMax}
                onChange={(event) =>
                  updateSource(source.key, {
                    expectedAmountMax: formatAmountInput(event.target.value),
                  })
                }
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`ob-income-savings-rate-${source.key}`}>
                Savings rate
              </Label>
              <SavingsRateStepper
                id={`ob-income-savings-rate-${source.key}`}
                value={source.savingsRate}
                onChange={(savingsRate) =>
                  updateSource(source.key, { savingsRate })
                }
              />
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
              <span className="font-semibold">Anchor income</span>
              <span className="ml-2">Used to keep payday cycles aligned.</span>
            </span>
            <span className="font-bold">{source.isAnchor ? 'Yes' : 'Set'}</span>
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
        Add income source
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
      <p className="text-[0.9rem] text-sea-ink-soft">
        How much can go out each cycle? Set a spending limit, then split it
        across Needs and Wants. Savings is tracked separately.
      </p>
      <div>
        <Label htmlFor="ob-spending-limit">Spending limit per cycle</Label>
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
          This is your spending envelope from payday to payday. Savings sits
          outside it.
        </p>
      </div>
      <div
        className={cn(
          'grid grid-cols-3 gap-2 rounded-2xl border p-3',
          overallocated > 0
            ? 'border-coral/30 bg-coral/8'
            : 'border-(--line) bg-(--chip-bg)',
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
            {overallocated > 0 ? 'Over' : 'Unallocated'}
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
          Reduce category plans by {formatK(overallocated)} to continue.
        </p>
      )}

      {(['needs', 'wants'] as BudgetGroup[]).map((group) => {
        const categories = BUDGETABLE_CATEGORIES.filter(
          (category) => category.budgetGroup === group,
        )
        if (categories.length === 0) return null
        return (
          <section key={group} className="space-y-2">
            <h2 className="field-label">{BUDGET_GROUP_LABELS[group]}</h2>
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
                      className="w-32"
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

  return (
    <div className="space-y-4">
      <p className="text-[0.9rem] text-sea-ink-soft">
        Check everything looks right. You can jump back to any step to adjust.
      </p>
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-2xl border border-(--line) p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-[0.95rem] font-bold text-sea-ink">
              {section.title}
            </h2>
            <Button
              type="button"
              variant="link"
              className="h-auto text-[0.8rem] font-bold"
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
