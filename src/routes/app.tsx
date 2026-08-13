import { convexQuery } from '@convex-dev/react-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { Suspense, useEffect, useRef, useState } from 'react'

import { api } from '../../convex/_generated/api'
import { AppHeader } from '#/components/app/app-header'
import { IncomeSourcesTask } from '#/components/app/income-sources-task'
import { ReconcileTask } from '#/components/app/reconcile-task'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

const bootstrapQuery = convexQuery(api.misi.bootstrap, {})

const APP_TASKS = ['reconcile', 'income-sources'] as const

export type AppTask = (typeof APP_TASKS)[number]

function mutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

export const Route = createFileRoute('/app')({
  validateSearch: (search): { task?: AppTask } => ({
    task: APP_TASKS.includes(search.task as AppTask)
      ? (search.task as AppTask)
      : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

function closeAppTask(
  navigate: ReturnType<typeof useNavigate>,
) {
  return navigate({
    to: '.',
    search: (prev) => ({ ...prev, task: undefined }),
    replace: true,
  })
}

function TaskOverlayFallback() {
  return (
    <div className="flex min-h-48 items-center justify-center text-sm text-sea-ink-soft">
      Loading…
    </div>
  )
}

function AppTaskOverlays({
  task,
  onClose,
}: {
  task?: AppTask
  onClose: () => void
}) {
  return (
    <>
      <Dialog
        open={task === 'reconcile'}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <DialogContent className="max-h-[min(90vh,760px)] max-w-2xl overflow-y-auto rounded-3xl border-(--line) bg-(--surface-strong) p-5 sm:p-7">
          <DialogHeader className="sr-only">
            <DialogTitle>Reconcile</DialogTitle>
            <DialogDescription>
              Compare Misi balances with your real accounts.
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<TaskOverlayFallback />}>
            <ReconcileTask />
          </Suspense>
        </DialogContent>
      </Dialog>
      <Dialog
        open={task === 'income-sources'}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <DialogContent className="max-h-[min(90vh,760px)] max-w-2xl overflow-y-auto rounded-3xl border-(--line) bg-(--surface-strong) p-5 sm:p-7">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="font-display text-2xl font-bold text-sea-ink">
              Income sources
            </DialogTitle>
            <DialogDescription className="text-sea-ink-soft">
              Update the income you expect each cycle and its savings split.
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<TaskOverlayFallback />}>
            <IncomeSourcesTask onClose={onClose} />
          </Suspense>
        </DialogContent>
      </Dialog>
    </>
  )
}

function AppLayout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { task } = Route.useSearch()
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
      <AppHeader cycle={data?.currentCycle} />
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
      <AppTaskOverlays
        task={task}
        onClose={() => void closeAppTask(navigate)}
      />
    </>
  )
}
