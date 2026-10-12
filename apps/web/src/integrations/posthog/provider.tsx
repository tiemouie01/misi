import { useEffect } from 'react'

import type { ReactNode } from 'react'

interface PostHogProviderProps {
  children: ReactNode
}

let posthogInitialized = false
let posthogInitPromise: Promise<void> | null = null

function initializePostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key || posthogInitialized || posthogInitPromise) return

  posthogInitPromise = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host:
          import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false,
        autocapture: true,
        defaults: '2025-11-30',
      })
      posthogInitialized = true
    })
    .catch((error: unknown) => {
      console.error('Unable to load PostHog analytics', error)
    })
    .finally(() => {
      posthogInitPromise = null
    })
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    initializePostHog()
  }, [])

  return children
}
