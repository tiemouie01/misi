import { CalendarIcon, Minus, Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'

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
import { Switch } from '#/components/ui/switch'
import {
  DAYS_OF_MONTH,
  buildReviewSections,
  incomeFieldId,
  ordinal,
} from '#/hooks/onboarding-step-helpers'
import {
  useAccountsStep,
  useBudgetsStep,
  useExpectedWindowPicker,
  useIncomeStep,
  usePaydayStep,
  useSavingsRateStepper,
  useWelcomeStep,
} from '#/hooks/use-onboarding-steps'
import { formatK } from '#/lib/app-data'
import {
  ACCOUNT_KIND_LABELS,
  ACCOUNT_PRESETS,
  BUDGETABLE_CATEGORIES,
  BUDGET_GROUP_LABELS,
} from '#/lib/onboarding-data'
import { cn } from '#/lib/utils'

import type { OnboardingDraftUpdater } from '#/hooks/onboarding-step-helpers'
import type { Account } from '#/lib/app-data'
import type {
  IncomeSourceIssue,
  OnboardingDraft,
  OnboardingStep,
} from '#/lib/onboarding-data'
import type { BudgetGroup } from '@misi/shared/category-defs'

export interface StepProps {
  draft: OnboardingDraft
  setDraft: OnboardingDraftUpdater
  goToStep: (step: OnboardingStep) => void
  error?: string | null
}

const accountKinds: Account['kind'][] = ['bank', 'mobile', 'cash', 'investment']

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
  const { open, setOpen, pendingStart, value, dayState, pickDay, clear, done } =
    useExpectedWindowPicker({ expectedDayStart, expectedDayEnd, onChange })

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
            const { inWindow, isEdge } = dayState(day)
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
          Day-of-month landing window each cycle
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
              onClick={clear}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              className="hover:translate-y-0 max-sm:h-10"
              onClick={done}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
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
  const { canDecrease, canIncrease, decrease, increase, setFromText } =
    useSavingsRateStepper(value, onChange)

  return (
    <div className="flex h-10 items-stretch overflow-hidden rounded-xl border border-(--chip-line) bg-(--chip-bg) shadow-sm focus-within:border-lagoon-deep focus-within:ring-2 focus-within:ring-lagoon/25">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 rounded-none text-sea-ink-soft hover:bg-(--link-bg-hover) hover:text-sea-ink"
        aria-label="Decrease savings rate by 5%"
        disabled={!canDecrease}
        onClick={decrease}
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
        onChange={(event) => setFromText(event.target.value)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 rounded-none text-sea-ink-soft hover:bg-(--link-bg-hover) hover:text-sea-ink"
        aria-label="Increase savings rate by 5%"
        disabled={!canIncrease}
        onClick={increase}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  )
}

export function WelcomeStep({ draft, setDraft, error }: StepProps) {
  const { setUsdRate, setDefaultSavingsRate, setSavingsOpeningBalance } =
    useWelcomeStep(setDraft)
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
          onChange={(event) => setUsdRate(event.target.value)}
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
          onChange={(event) => setDefaultSavingsRate(event.target.value)}
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
          onChange={(event) => setSavingsOpeningBalance(event.target.value)}
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
  const { setPaydayDay } = usePaydayStep(setDraft)

  return (
    <div className="space-y-4">
      <p className="text-[0.9rem] text-sea-ink-soft">
        Misi budgets from payday to payday, not calendar months. Pick the day
        your main income lands.
      </p>
      <div>
        <Label htmlFor="ob-payday">Payday</Label>
        <Select value={String(draft.paydayDay)} onValueChange={setPaydayDay}>
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
  const {
    isPresetSelected,
    togglePreset,
    updateAccount,
    setAccountKind,
    setAccountBalance,
    removeAccount,
    addAccount,
  } = useAccountsStep(draft, setDraft)

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
              className="hover:translate-y-0 max-sm:h-10 max-sm:px-4 max-sm:text-sm"
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
                    onClick={() => removeAccount(account.key)}
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
                        setAccountKind(account.key, value as Account['kind'])
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
                    setAccountBalance(account.key, event.target.value)
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
        onClick={addAccount}
      >
        <Plus className="size-4" />
        Add another account
      </Button>
    </div>
  )
}

export function IncomeStep({
  draft,
  setDraft,
  error,
  showIntro = true,
}: StepProps & { showIntro?: boolean }) {
  const {
    invalidId,
    updateSource,
    setExpectedAmount,
    setExpectedAmountMax,
    removeSource,
    setAnchor,
    addSource,
  } = useIncomeStep(draft, setDraft, error)

  useEffect(() => {
    if (!invalidId) return
    const field = document.getElementById(invalidId)
    field?.scrollIntoView({ block: 'center' })
    field?.focus({ preventScroll: true })
  }, [invalidId])

  function fieldA11y(sourceKey: string, field: IncomeSourceIssue['field']) {
    const id = incomeFieldId(sourceKey, field)
    return id === invalidId
      ? { id, 'aria-invalid': true, 'aria-describedby': `${id}-error` }
      : { id }
  }

  function fieldError(sourceKey: string, field: IncomeSourceIssue['field']) {
    const id = incomeFieldId(sourceKey, field)
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

  return (
    <div className="space-y-4">
      {showIntro && (
        <p className="text-[0.9rem] text-sea-ink-soft">
          What money do you expect each cycle? Add a landing window and amount
          so Misi can compare planned income with what actually lands. Skip this
          if you'd rather add it later.
        </p>
      )}
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
              onClick={() => removeSource(source.key)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          {fieldError(source.key, 'name')}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`ob-income-window-${source.key}`}>
                Landing window
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
              <Label htmlFor={`ob-income-amount-${source.key}`}>
                Expected amount
              </Label>
              <Input
                {...fieldA11y(source.key, 'amount')}
                inputMode="numeric"
                placeholder="1,850,000"
                value={source.expectedAmount}
                onChange={(event) =>
                  setExpectedAmount(source.key, event.target.value)
                }
              />
              {fieldError(source.key, 'amount')}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`ob-income-amount-max-${source.key}`}>
                High end (optional)
              </Label>
              <Input
                {...fieldA11y(source.key, 'amount-max')}
                inputMode="numeric"
                placeholder="For variable income"
                value={source.expectedAmountMax}
                onChange={(event) =>
                  setExpectedAmountMax(source.key, event.target.value)
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
            onClick={() => setAnchor(source.key)}
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
        onClick={addSource}
      >
        <Plus className="size-4" />
        Add income source
      </Button>
    </div>
  )
}

export function BudgetsStep({ draft, setDraft, error }: StepProps) {
  const {
    categoryTotal,
    spendingLimit,
    unallocated,
    overallocated,
    setSpendingLimit,
    updatePlannedAmount,
    plannedAmountFor,
  } = useBudgetsStep(draft, setDraft)
  const invalid = Boolean(error)

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
          onChange={(event) => setSpendingLimit(event.target.value)}
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
              {categories.map((category) => (
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
                    value={plannedAmountFor(category.id)}
                    onChange={(event) =>
                      updatePlannedAmount(category.id, event.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function ReviewStep({ draft, goToStep }: StepProps) {
  const sections = buildReviewSections(draft)

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
