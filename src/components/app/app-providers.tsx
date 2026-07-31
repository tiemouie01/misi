import ConvexProvider from '#/integrations/convex/provider'
import PostHogProvider from '#/integrations/posthog/provider'
import PowerSyncProvider from '#/integrations/powersync/provider'

import type { ReactNode } from 'react'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider>
      <PowerSyncProvider>
        <PostHogProvider>{children}</PostHogProvider>
      </PowerSyncProvider>
    </ConvexProvider>
  )
}
