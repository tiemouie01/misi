import { useMutation } from 'convex/react'
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
import { MisiMark } from '#/components/misi-mark'
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
  firstIncompleteStep,
  formatAmountInput,
  loadDraft,
  parseAmount,
  saveDraft,
  validateStep,
} from '#/lib/onboarding-data'

import type { FunctionReturnType } from 'convex/server'
import type { OnboardingDraft, OnboardingStep } from '#/lib/onboarding-data'

type Prefill = FunctionReturnType<typeof api.misi.onboardingData>

const STEP_TITLES: Record<OnboardingStep, string> = {
  welcome: 'Welcome to Misi',
  payday: 'When is payday?',
  accounts: 'Your accounts',
  income: 'Expected income',
  budgets: 'Cycle budgets',
  review: 'Review & start',
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
    if (error) errorRef.current?.focus()
  }, [error])

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
        accounts: draft.accounts.map((account) => ({
          name: account.name.trim(),
          kind: account.kind,
          currency: account.currency,
          balance: parseAmount(account.balance),
          includeInSpendable: account.includeInSpendable,
        })),
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
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to finish setup. Try again.',
      )
      setSubmitting(false)
    }
  }

  const stepProps = { draft, setDraft, goToStep: onStepChange, error }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="page-wrap flex items-center justify-between py-4">
        <span className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-lagoon-deep to-palm text-(--btn-text) shadow-md">
            <MisiMark className="size-5" />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-sea-ink">
            Misi
          </span>
        </span>
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:pt-10">
        <Card
          variant="island"
          className="w-full max-w-lg rounded-3xl p-6 sm:p-8"
        >
          <p className="island-kicker">
            Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display mt-2 text-2xl font-bold tracking-tight text-sea-ink outline-none"
          >
            {STEP_TITLES[step]}
          </h1>
          <Progress
            className="mt-4"
            value={((stepIndex + 1) / ONBOARDING_STEPS.length) * 100}
            aria-label="Onboarding progress"
          />

          <div className="mt-6">
            {step === 'welcome' && <WelcomeStep {...stepProps} />}
            {step === 'payday' && <PaydayStep {...stepProps} />}
            {step === 'accounts' && <AccountsStep {...stepProps} />}
            {step === 'income' && <IncomeStep {...stepProps} />}
            {step === 'budgets' && <BudgetsStep {...stepProps} />}
            {step === 'review' && <ReviewStep {...stepProps} />}
          </div>

          {error && (
            <p
              ref={errorRef}
              id="onboarding-error"
              role="alert"
              tabIndex={-1}
              className="mt-4 text-[0.85rem] font-semibold outline-none"
              style={{ color: 'var(--coral)' }}
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            {isFirst ? (
              <span />
            ) : (
              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={goBack}
              >
                Back
              </Button>
            )}
            {isLast ? (
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void submit()}
              >
                {submitting ? 'Setting up…' : 'Start using Misi'}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                Continue
              </Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  )
}
