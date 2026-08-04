import { convexQuery } from '@convex-dev/react-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useEffect, useRef, useState } from 'react'

import { api } from '../../convex/_generated/api'

const bootstrapQuery = convexQuery(api.misi.bootstrap, {})

function mutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

export const Route = createFileRoute('/app')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

function AppLayout() {
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(bootstrapQuery)
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
        return queryClient.invalidateQueries({
          queryKey: bootstrapQuery.queryKey,
        })
      })
      .catch((error) => {
        requestedCategorySeed.current = false
        setSetupError(
          mutationErrorMessage(error, 'Unable to set up your categories'),
        )
        console.error('Unable to set up categories', error)
      })
  }, [categoryCount, data, ensureDefaultCategories, queryClient])

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
