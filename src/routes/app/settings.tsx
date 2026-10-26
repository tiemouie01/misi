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
      <main className="page-wrap py-6 sm:py-8">
        <header>
          <p className="text-sm text-sea-ink-soft">
            Your money, payday and accounts
          </p>
          <h1 className="font-display mt-1 text-[1.75rem] font-bold tracking-tight text-sea-ink sm:text-4xl">
            Settings
          </h1>
        </header>

        {/* One column until `xl`, in reading order. From there the everyday
            money settings take the wide left column and the occasional ones
            (other pages, theme, sign out) stack on the right. */}
        <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start">
          <div className="grid gap-4 sm:gap-6">
            <MoneySection />
            <CycleSection />
            <AccountsSection />
            <QuickAddDefaultsSection />
          </div>
          <div className="grid gap-4 sm:gap-6">
            <ManageSection />
            <AppearanceSection />
            <AccountSection />
          </div>
        </div>
      </main>
    </AppProviders>
  )
}
