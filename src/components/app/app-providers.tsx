import PostHogProvider from '#/integrations/posthog/provider'

import type { ReactNode } from 'react'

/** Analytics providers for authenticated app surfaces — not the marketing site. */
export function AppProviders({ children }: { children: ReactNode }) {
  return <PostHogProvider>{children}</PostHogProvider>
}
