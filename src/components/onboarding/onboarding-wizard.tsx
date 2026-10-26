import { useMutation } from 'convex/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { api } from '../../../convex/_generated/api'
import {
  AccountsStep,
  BudgetsStep,
  IncomeStep,
  PaydayStep,
  ReviewStep,
  WelcomeStep,
} from '#/components/onboarding/onboarding-steps'
import { BrandMark } from '#/components/misi-mark'
import { ThemeToggle } from '#/components/theme-toggle'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Progress } from '#/components/ui/progress'
import {
  ACCOUNT_PRESETS,
  BUDGETABLE_CATEGORIES,
  DEFAULT_USD_RATE,
  ONBOARDING_STEPS,
  clearDraft,
  defaultDraft,
  draftAccountInput,
  firstIncompleteStep,
  formatAmountInput,
  loadDraft,
  parseAmount,
  saveDraft,
  validateIncomeSources,
  validateStep,
} from '#/lib/onboarding-data'
import { errorMessage } from '#/lib/error-message'

import type { FunctionReturnType } from 'convex/server'
import type { OnboardingDraft, OnboardingStep } from '#/lib/onboarding-data'

type Prefill = FunctionReturnType<typeof api.misi.onboardingData>

const STEP_TITLES: Record<OnboardingStep, string> = {
  welcome: 'Welcome to Misi',
  payday: 'When is payday?',
  accounts: 'Where is your money?',
  income: 'Money coming in',
  budgets: 'Your spending plan',
  review: 'Check and start',
}

const STEP_INTROS: Record<OnboardingStep, string> = {
  welcome: 'A few basics first. You can change all of this later.',
  payday:
    'Misi plans from one payday to the next. Pick the day your main pay comes.',
  accounts:
    'Pick the places you keep money, then type how much is in each today.',
  income:
    'Add the money you expect each month. You can skip this and add it later.',
  budgets:
    'Choose how much you can spend each pay month, then share it out. Savings is kept apart.',
  review: 'Check that this looks right. Tap Edit to change anything.',
}

function accountIsPreset(name: string): boolean {
  return ACCOUNT_PRESETS.some(
    (preset) => preset.name.toLowerCase() === name.toLowerCase(),
  )
}

function draftFromPrefill(data: Prefill): OnboardingDraft {
  if (data.settings === null && data.accounts.length === 0) {
    return defaultDraft()
  }
  const fallback = defaultDraft()
  const cyclePlansBySource = new Map(
    data.cycleIncomePlans.map((plan) => [plan.sourceId, plan]),
  )
  return {
    usdRate: formatAmountInput(
      String(data.settings?.usdRate ?? DEFAULT_USD_RATE),
    ),
    defaultSavingsRate: String(
      Math.round((data.settings?.defaultSavingsRate ?? 0.2) * 100),
    ),
    paydayDay: data.settings?.paydayDay ?? 20,
    savingsOpeningBalance: data.settings?.savingsOpeningBalance
      ? formatAmountInput(String(data.settings.savingsOpeningBalance))
      : '',
    spendingLimit:
      data.spendingLimit === null
        ? fallback.spendingLimit
        : formatAmountInput(String(data.spendingLimit)),
    accounts: data.accounts.map((account) => ({
      key: account._id,
      name: account.name,
      kind: account.kind,
      currency: account.currency,
      balance: formatAmountInput(String(account.balance)),
      isPreset: accountIsPreset(account.name),
      includeInSpendable:
        account.includeInSpendable ?? account.kind !== 'investment',
    })),
    incomeSources: data.incomeSources.map((source) => {
      const cyclePlan = cyclePlansBySource.get(source._id)
      const expectedAmount = cyclePlan?.expectedAmount ?? source.expectedAmount
      const expectedAmountMax =
        cyclePlan?.expectedAmountMax ?? source.expectedAmountMax
      const savingsRate = cyclePlan?.savingsRate ?? source.savingsRate
      return {
        key: source._id,
        name: source.name,
        expectedDayStart: String(source.expectedDayStart),
        expectedDayEnd: String(source.expectedDayEnd),
        expectedAmount: formatAmountInput(String(expectedAmount)),
        expectedAmountMax:
          expectedAmountMax === undefined
            ? ''
            : formatAmountInput(String(expectedAmountMax)),
        savingsRate: String(Math.round(savingsRate * 100)),
        isAnchor: source.isAnchor,
      }
    }),
    budgets: BUDGETABLE_CATEGORIES.map((category) => {
      const budget = data.budgets.find(
        (item) => item.categoryId === category.id,
      )?.plannedAmount
      return {
        categoryId: category.id,
        plannedAmount:
          budget === undefined ? '' : formatAmountInput(String(budget)),
      }
    }),
  }
}

export function OnboardingWizard({
  prefill,
  step,
  userKey,
  onStepChange,
  onComplete,
}: {
  prefill: Prefill
  step: OnboardingStep
  userKey: string
  onStepChange: (step: OnboardingStep) => void
  onComplete: () => void
}) {
  const completeOnboarding = useMutation(api.misi.completeOnboarding)
  const [draft, setDraftState] = useState<OnboardingDraft>(
    () => loadDraft(userKey) ?? draftFromPrefill(prefill),
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)

  const stepIndex = ONBOARDING_STEPS.indexOf(step)
  const isFirst = stepIndex === 0
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1
  // The income step shows field-level errors next to the field itself.
  const errorShownInline =
    step === 'income' &&
    error !== null &&
    validateIncomeSources(draft)?.message === error

  useEffect(() => {
    const resumeStep = firstIncompleteStep(draft)
    if (ONBOARDING_STEPS.indexOf(step) > ONBOARDING_STEPS.indexOf(resumeStep)) {
      onStepChange(resumeStep)
    }
    // Only correct step on initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (error && !errorShownInline) errorRef.current?.focus()
  }, [error, errorShownInline])

  function setDraft(updater: (draft: OnboardingDraft) => OnboardingDraft) {
    setDraftState((current) => {
      const next = updater(current)
      saveDraft(userKey, next)
      return next
    })
    setError(null)
  }

  function goNext() {
    const message = validateStep(step, draft)
    if (message) {
      setError(message)
      return
    }
    onStepChange(ONBOARDING_STEPS[stepIndex + 1])
  }

  function goBack() {
    setError(null)
    onStepChange(ONBOARDING_STEPS[stepIndex - 1])
  }

  async function submit() {
    setError(null)
    const budgetError = validateStep('budgets', draft)
    if (budgetError) {
      setError(budgetError)
      onStepChange('budgets')
      return
    }
    setSubmitting(true)
    const activeBudgets = draft.budgets
      .map((budget) => ({
        categoryId: budget.categoryId,
        plannedAmount: parseAmount(budget.plannedAmount),
      }))
      .filter((budget) => budget.plannedAmount > 0)
    const spendingLimit = parseAmount(draft.spendingLimit)

    try {
      await completeOnboarding({
        usdRate: parseAmount(draft.usdRate),
        defaultSavingsRate: Number(draft.defaultSavingsRate) / 100,
        paydayDay: draft.paydayDay,
        savingsOpeningBalance: parseAmount(draft.savingsOpeningBalance),
        spendingLimit,
        accounts: draft.accounts.map(draftAccountInput),
        incomeSources: draft.incomeSources.map((source) => ({
          name: source.name.trim(),
          expectedDayStart: Number(source.expectedDayStart),
          expectedDayEnd: Number(source.expectedDayEnd),
          expectedAmount: parseAmount(source.expectedAmount),
          ...(source.expectedAmountMax.trim() === ''
            ? {}
            : { expectedAmountMax: parseAmount(source.expectedAmountMax) }),
          savingsRate: Number(source.savingsRate) / 100,
          isAnchor: source.isAnchor,
        })),
        budgets: activeBudgets,
      })
      clearDraft(userKey)
      onComplete()
    } catch (caughtError) {
      setError(errorMessage(caughtError, 'Unable to finish setup. Try again.'))
      setSubmitting(false)
    }
  }

  const stepProps = { draft, setDraft, goToStep: onStepChange, error }

  return (
    <div className="app-ground flex flex-col">
      <header className="page-wrap flex items-center justify-between gap-3 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <span className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-2xl font-bold tracking-tight text-sea-ink">
            Misi
          </span>
        </span>
        <ThemeToggle compact />
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-4 sm:pt-8 sm:pb-16">
        <p className="text-sm font-semibold text-sea-ink-soft">
          Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
        </p>
        <Progress
          className="mt-2 h-2.5 bg-white/16 dark:bg-lagoon-deep/12 [&_[data-slot=progress-indicator]]:bg-none [&_[data-slot=progress-indicator]]:bg-lagoon"
          value={((stepIndex + 1) / ONBOARDING_STEPS.length) * 100}
          aria-label="Setup progress"
        />
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display mt-5 text-[1.75rem] leading-tight font-bold tracking-tight text-sea-ink outline-none sm:mt-6 sm:text-4xl"
        >
          {STEP_TITLES[step]}
        </h1>
        <p className="mt-2 text-[0.95rem] text-sea-ink-soft">
          {STEP_INTROS[step]}
        </p>

        <Card
          variant="panel"
          className="mt-5 gap-0 p-4 max-sm:mb-5 sm:mt-6 sm:p-6"
        >
          {step === 'welcome' && <WelcomeStep {...stepProps} />}
          {step === 'payday' && <PaydayStep {...stepProps} />}
          {step === 'accounts' && <AccountsStep {...stepProps} />}
          {step === 'income' && <IncomeStep {...stepProps} />}
          {step === 'budgets' && <BudgetsStep {...stepProps} />}
          {step === 'review' && <ReviewStep {...stepProps} />}

          {error && !errorShownInline && (
            <p
              ref={errorRef}
              id="onboarding-error"
              role="alert"
              tabIndex={-1}
              className="mt-4 text-[0.85rem] font-semibold text-coral-deep outline-none"
            >
              {error}
            </p>
          )}
        </Card>

        {/* On phones the actions stick to the bottom so Next is always in
            reach, even on long steps. */}
        <div className="mt-6 flex items-center gap-3 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:mt-auto max-sm:bg-(--header-bg) max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:backdrop-blur-md">
          {!isFirst && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-14 px-5 text-base text-sea-ink"
              disabled={submitting}
              onClick={goBack}
            >
              <ArrowLeft className="size-5" />
              Back
            </Button>
          )}
          {isLast ? (
            <Button
              type="button"
              size="lg"
              className="h-14 flex-1 text-base"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? 'Setting up…' : 'Start using Misi'}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              className="h-14 flex-1 text-base"
              onClick={goNext}
            >
              Next
              <ArrowRight className="size-5" />
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
