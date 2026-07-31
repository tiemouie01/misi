import ConvexProvider from '#/integrations/convex/provider'
import PostHogProvider from '#/integrations/posthog/provider'
import PowerSyncProvider from '#/integrations/powersync/provider'

import type { ReactNode } from 'react'

/** Backend/sync providers for authenticated app surfaces — not the marketing site. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider>
      <PowerSyncProvider>
        <PostHogProvider>{children}</PostHogProvider>
      </PowerSyncProvider>
    </ConvexProvider>
  )
}
