import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useEffect, useRef, useState } from 'react'

import { api } from '../../convex/_generated/api'
import { AppProviders } from '#/components/app/app-providers'
import { useLocalBootstrap } from '#/lib/local/reads'

function mutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

export const Route = createFileRoute('/app')({
  // PowerSync (local SQLite) is browser-only, so the app shell never SSRs.
  ssr: false,
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <AppProviders>
      <AppLayoutContent />
    </AppProviders>
  )
}

function AppLayoutContent() {
  const { isLoading, data } = useLocalBootstrap()
  const ensureDefaultCategories = useMutation(api.misi.ensureDefaultCategories)
  const requestedCategorySeed = useRef(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const categoryCount = data?.categories.length ?? 0

  useEffect(() => {
    if (
      requestedCategorySeed.current ||
      !data?.settings?.onboardedAt ||
      categoryCount > 0
    ) {
      return
    }
    requestedCategorySeed.current = true
    void ensureDefaultCategories({})
      .then(() => {
        setSetupError(null)
      })
      .catch((error) => {
        requestedCategorySeed.current = false
        setSetupError(
          mutationErrorMessage(error, 'Unable to set up your categories'),
        )
        console.error('Unable to set up categories', error)
      })
  }, [categoryCount, data, ensureDefaultCategories])

  if (isLoading) return null

  return (
    <>
      {setupError && categoryCount === 0 && (
        <p
          role="alert"
          className="page-wrap py-4 text-sm font-semibold text-coral-deep"
        >
          <span className="block rounded-xl bg-coral/8 px-4 py-3">
            {setupError}
          </span>
        </p>
      )}
      <Outlet />
    </>
  )
}
