import { usePowerSync } from '@powersync/react'
import {
  createFileRoute,
  Link,
  Navigate,
  useNavigate,
} from '@tanstack/react-router'
import { useState } from 'react'

import { AppHeader } from '#/components/app/app-header'
import { IncomeStep } from '#/components/onboarding/onboarding-steps'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  defaultDraft,
  formatAmountInput,
  parseAmount,
  validateStep,
} from '#/lib/onboarding-data'
import { useLocalBootstrap } from '#/lib/local/reads'
import { updateIncomeSources } from '#/lib/local/writes'

import type { LocalBootstrapData } from '#/lib/local/reads'
import type { OnboardingDraft } from '#/lib/onboarding-data'

export const Route = createFileRoute('/app/income-sources')({
  component: IncomeSourcesPage,
})

function IncomeSourcesPage() {
  return <IncomeSourcesGate />
}

function IncomeSourcesGate() {
  const { isLoading, data } = useLocalBootstrap()

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <AppHeader badge="Income sources" />
        <main className="page-wrap py-6 sm:py-8">
          <p className="text-sm text-sea-ink-soft">Loading income sources…</p>
        </main>
      </div>
    )
  }

  if (data === null || !data.settings?.onboardedAt) {
    return <Navigate to="/onboarding" />
  }

  return <IncomeSourcesForm data={data} />
}

function buildDraft(data: LocalBootstrapData): OnboardingDraft {
  return {
    ...defaultDraft(),
    defaultSavingsRate: String(
      Math.round((data.settings?.defaultSavingsRate ?? 0.2) * 100),
    ),
    incomeSources: data.incomeSources.map((source) => {
      const plan = data.cycleIncomePlans.find(
        (candidate) => candidate.sourceId === source.id,
      )
      return {
        key: source.id,
        name: source.name,
        expectedDayStart: String(source.expectedDayStart),
        expectedDayEnd: String(source.expectedDayEnd),
        expectedAmount: formatAmountInput(
          String(plan?.expectedAmount ?? source.expectedAmount),
        ),
        expectedAmountMax:
          (plan?.expectedAmountMax ?? source.expectedAmountMax) === undefined
            ? ''
            : formatAmountInput(
                String(plan?.expectedAmountMax ?? source.expectedAmountMax),
              ),
        savingsRate: String(
          Math.round((plan?.savingsRate ?? source.savingsRate) * 100),
        ),
        isAnchor: source.isAnchor,
      }
    }),
  }
}

function IncomeSourcesForm({ data }: { data: LocalBootstrapData }) {
  const navigate = useNavigate({ from: Route.fullPath })
  const db = usePowerSync()
  const [draft, setDraft] = useState<OnboardingDraft>(() => buildDraft(data))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function updateDraft(updater: (current: OnboardingDraft) => OnboardingDraft) {
    setDraft(updater)
    setError(null)
  }

  async function save() {
    const validationError = validateStep('income', draft)
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateIncomeSources(db, {
        incomeSources: draft.incomeSources.map((source) => ({
          ...(data.incomeSources.some((item) => item.id === source.key)
            ? { id: source.key }
            : {}),
          name: source.name.trim(),
          expectedDayStart: Number(source.expectedDayStart),
          expectedDayEnd: Number(source.expectedDayEnd),
          expectedAmount: parseAmount(source.expectedAmount),
          ...(source.expectedAmountMax.trim()
            ? { expectedAmountMax: parseAmount(source.expectedAmountMax) }
            : {}),
          savingsRate: Number(source.savingsRate) / 100,
          isAnchor: source.isAnchor,
        })),
      })
      await navigate({ to: '/app/budget' })
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to save income sources',
      )
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader badge="Income sources" />
      <main className="page-wrap py-6 sm:py-8">
        <Card
          variant="island"
          className="mx-auto max-w-2xl rounded-3xl p-5 sm:p-7"
        >
          <h1 className="font-display text-2xl font-bold text-sea-ink">
            Income sources
          </h1>
          <p className="mt-1 mb-6 text-sm text-sea-ink-soft">
            Update the income you expect each cycle and its savings split.
          </p>
          <IncomeStep
            draft={draft}
            setDraft={updateDraft}
            goToStep={() => undefined}
            error={error}
          />
          {error && (
            <p
              role="alert"
              className="mt-4 text-sm font-semibold text-coral-deep"
            >
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button asChild variant="ghost" disabled={saving}>
              <Link to="/app/budget">Cancel</Link>
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? 'Saving…' : 'Save income sources'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
