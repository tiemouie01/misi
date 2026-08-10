import { convexQuery } from '@convex-dev/react-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { AppHeader } from '#/components/app/app-header'
import { AppProviders } from '#/components/app/app-providers'
import { IncomeStep } from '#/components/onboarding/onboarding-steps'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  defaultDraft,
  formatAmountInput,
  parseAmount,
  validateStep,
} from '#/lib/onboarding-data'

import type { OnboardingDraft } from '#/lib/onboarding-data'

const bootstrapQuery = convexQuery(api.misi.bootstrap, {})
const incomeSourcesQuery = convexQuery(api.misi.onboardingData, {})

export const Route = createFileRoute('/app/income-sources')({
  loader: async ({ context }) => {
    const [bootstrap] = await Promise.all([
      context.queryClient.ensureQueryData(bootstrapQuery),
      context.queryClient.ensureQueryData(incomeSourcesQuery),
    ])
    if (bootstrap === null || !bootstrap.settings?.onboardedAt) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: IncomeSourcesPage,
})

function IncomeSourcesPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(incomeSourcesQuery)
  const updateIncomeSources = useMutation(api.misi.updateIncomeSources)
  const [draft, setDraft] = useState<OnboardingDraft>(() => ({
    ...defaultDraft(),
    defaultSavingsRate: String(
      Math.round((data.settings?.defaultSavingsRate ?? 0.2) * 100),
    ),
    incomeSources: data.incomeSources.map((source) => {
      const plan = data.cycleIncomePlans.find(
        (candidate) => candidate.sourceId === source._id,
      )
      return {
        key: source._id,
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
  }))
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
      await updateIncomeSources({
        incomeSources: draft.incomeSources.map((source) => ({
          ...(data.incomeSources.some((item) => item._id === source.key)
            ? { id: source.key as (typeof data.incomeSources)[number]['_id'] }
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bootstrapQuery.queryKey }),
        queryClient.invalidateQueries({
          queryKey: incomeSourcesQuery.queryKey,
        }),
      ])
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
    <AppProviders>
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
    </AppProviders>
  )
}
