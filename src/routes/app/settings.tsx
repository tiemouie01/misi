import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'

import { api } from '../../../convex/_generated/api'
import { AppProviders } from '#/components/app/app-providers'
import { AccountSection } from '#/components/settings/account-section'
import { AccountsSection } from '#/components/settings/accounts-section'
import { AppearanceSection } from '#/components/settings/appearance-section'
import { CycleSection } from '#/components/settings/cycle-section'
import { ManageSection } from '#/components/settings/manage-section'
import { MoneySection } from '#/components/settings/money-section'
import { QuickAddDefaultsSection } from '#/components/settings/quick-add-defaults-section'

const bootstrapQuery = convexQuery(api.misi.bootstrap, {})

export const Route = createFileRoute('/app/settings')({
  loader: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData(bootstrapQuery)
    if (data === null || !data.settings?.onboardedAt) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <AppProviders>
      <div className="min-h-screen">
        <main className="page-wrap py-6 sm:py-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
            Settings
          </h1>
          <div className="mt-6 flex max-w-2xl flex-col gap-4 sm:gap-5">
            <MoneySection />
            <CycleSection />
            <QuickAddDefaultsSection />
            <AccountsSection />
            <AppearanceSection />
            <ManageSection />
            <AccountSection />
          </div>
        </main>
      </div>
    </AppProviders>
  )
}
