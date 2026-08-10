import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { api } from '../../convex/_generated/api'
import { OnboardingWizard } from '#/components/onboarding/onboarding-wizard'
import { authClient } from '#/lib/auth-client'
import { ONBOARDING_STEPS } from '#/lib/onboarding-data'

import type { OnboardingStep } from '#/lib/onboarding-data'

export const Route = createFileRoute('/onboarding')({
  validateSearch: (search): { step?: OnboardingStep } => ({
    step: ONBOARDING_STEPS.includes(search.step as OnboardingStep)
      ? (search.step as OnboardingStep)
      : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) throw redirect({ to: '/login' })
  },
  loader: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData(
      convexQuery(api.misi.onboardingData, {}),
    )
    if (data.settings?.onboardedAt) {
      throw redirect({ to: '/app' })
    }
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const { step } = Route.useSearch()
  const activeStep = step ?? 'welcome'
  const navigate = useNavigate()
  const { data } = useSuspenseQuery(convexQuery(api.misi.onboardingData, {}))
  const { data: session, isPending } = authClient.useSession()
  const userKey = session?.user.id ?? 'default'

  if (isPending) {
    return (
      <div className="page-wrap py-20 text-center text-sea-ink-soft">
        Loading setup…
      </div>
    )
  }

  return (
    <OnboardingWizard
      key={userKey}
      prefill={data}
      userKey={userKey}
      step={activeStep}
      onStepChange={(next) =>
        void navigate({
          to: '/onboarding',
          search: { step: next },
        })
      }
      onComplete={() => void navigate({ to: '/app' })}
    />
  )
}
