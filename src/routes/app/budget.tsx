import { convexQuery } from '@convex-dev/react-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { AppHeader } from '#/components/app/app-header'
import { AppProviders } from '#/components/app/app-providers'
import { BudgetPage } from '#/components/budget'
import { Button } from '#/components/ui/button'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'

import type { Id } from '../../../convex/_generated/dataModel'
import type {
  BudgetCycle,
  BudgetHistoryRow,
  BudgetPlanUpdate,
} from '#/components/budget'

const DAY_MS = 86_400_000
const bootstrapQuery = convexQuery(api.misi.bootstrap, {})
const budgetOverviewQuery = convexQuery(api.misi.budgetOverview, {})

export const Route = createFileRoute('/app/budget')({
  loader: async ({ context }) => {
    const [bootstrap] = await Promise.all([
      context.queryClient.ensureQueryData(bootstrapQuery),
      context.queryClient.ensureQueryData(budgetOverviewQuery),
    ])
    if (bootstrap === null || !bootstrap.settings?.onboardedAt) {
      throw redirect({ to: '/onboarding' })
    }
    return { now: Date.now() }
  },
  component: BudgetRoute,
})

function shortDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Blantyre',
  }).format(new Date(timestamp))
}

function expectedWindow(start: number, end: number) {
  if (start === end) return `Expected on day ${start}`
  return `Expected days ${start}–${end}`
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

function BudgetRoute() {
  const { now } = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { data: bootstrap } = useSuspenseQuery(bootstrapQuery)
  const { data: overview } = useSuspenseQuery(budgetOverviewQuery)
  const saveCyclePlan = useMutation(api.misi.saveCyclePlan)
  const ensureSeedData = useMutation(api.misi.ensureSeedData)
  const [selectedCycleId, setSelectedCycleId] = useState<string>()
  const [saveError, setSaveError] = useState<string | null>(null)
  const requestedRollover = useRef(false)
  const cycleNeedsRollover =
    bootstrap?.currentCycle != null && bootstrap.currentCycle.endsAt < now

  useEffect(() => {
    if (!cycleNeedsRollover || requestedRollover.current) return
    requestedRollover.current = true
    void ensureSeedData({})
      .then(async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: bootstrapQuery.queryKey }),
          queryClient.invalidateQueries({
            queryKey: budgetOverviewQuery.queryKey,
          }),
        ])
      })
      .catch((error) => {
        requestedRollover.current = false
        setSaveError(errorMessage(error, 'Unable to start the new cycle'))
      })
  }, [cycleNeedsRollover, ensureSeedData, queryClient])

  const categoriesByKey = useMemo(
    () =>
      new Map(
        (bootstrap?.categories ?? []).map((category) => [
          category.key,
          category,
        ]),
      ),
    [bootstrap?.categories],
  )

  const cycles = useMemo<BudgetCycle[]>(
    () =>
      overview.cycles.map((view) => {
        const totalDays = Math.max(
          1,
          Math.round((view.cycle.endsAt + 1 - view.cycle.startsAt) / DAY_MS),
        )
        const daysElapsed = Math.min(
          totalDays,
          Math.max(0, Math.floor((now - view.cycle.startsAt) / DAY_MS) + 1),
        )

        return {
          id: view.cycle._id,
          label: view.cycle.label,
          rangeLabel: `${shortDate(view.cycle.startsAt)} – ${shortDate(view.cycle.endsAt)}`,
          expectedIncome: view.plannedIncome,
          actualIncome: view.actualIncome,
          actualSavings: view.actualSavings,
          actualSpending: view.actualSpending,
          isClosed: view.cycle.endsAt < now,
          spendingLimit: view.spendingLimit,
          previousActualSpending: view.previousActualSpending,
          daysElapsed,
          totalDays,
          categories: view.categoryRows
            .filter((row) => !row.archived)
            .map((row) => {
              const category = categoriesByKey.get(row.categoryId)
              return {
                id: row.categoryId,
                name: row.categoryName,
                group: row.budgetGroup,
                planned: row.plannedAmount,
                spent: row.actualAmount,
                previousSpent: row.previousActualAmount,
                icon: category ? resolveCategoryIcon(category.icon) : undefined,
                color: category
                  ? resolveCategoryColor(category.color)
                  : undefined,
              }
            }),
          incomeSources: view.incomePlans.map((source) => ({
            id: source.sourceId,
            name: source.sourceName,
            expectedAmount: source.expectedAmount,
            expectedAmountMax: source.expectedAmountMax,
            actualAmount: source.actualAmount,
            savingsRate: source.savingsRate,
            status:
              source.actualAmount >= source.expectedAmount
                ? 'landed'
                : source.actualAmount > 0
                  ? 'partial'
                  : 'pending',
            note: expectedWindow(
              source.expectedDayStart,
              source.expectedDayEnd,
            ),
          })),
        }
      }),
    [categoriesByKey, now, overview.cycles],
  )

  const history = useMemo<BudgetHistoryRow[]>(
    () =>
      overview.cycles
        .filter((view) => view.cycle.endsAt < now)
        .map((view) => ({
          id: view.cycle._id,
          label: view.cycle.label,
          rangeLabel: `${shortDate(view.cycle.startsAt)} – ${shortDate(view.cycle.endsAt)}`,
          income: view.actualIncome,
          needs: view.categoryRows
            .filter((row) => row.budgetGroup === 'needs')
            .reduce((sum, row) => sum + row.actualAmount, 0),
          wants: view.categoryRows
            .filter((row) => row.budgetGroup === 'wants')
            .reduce((sum, row) => sum + row.actualAmount, 0),
          savings: view.actualSavings,
          spent: view.actualSpending,
          surplus: view.cashSurplusOrDeficit,
        })),
    [now, overview.cycles],
  )

  async function savePlan(update: BudgetPlanUpdate) {
    setSaveError(null)
    try {
      await saveCyclePlan({
        cycleId: update.cycleId as Id<'cycles'>,
        spendingLimit: update.spendingLimit,
        categoryPlans: [...update.categoryPlans],
        incomePlans: update.incomePlans?.map((plan) => ({
          sourceId: plan.sourceId as Id<'incomeSources'>,
          expectedAmount: plan.expectedAmount,
          expectedAmountMax: plan.expectedAmountMax,
          savingsRate: plan.savingsRate,
        })),
      })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: budgetOverviewQuery.queryKey,
        }),
        queryClient.invalidateQueries({ queryKey: bootstrapQuery.queryKey }),
      ])
    } catch (error) {
      const message = errorMessage(error, 'Unable to save this cycle plan')
      setSaveError(message)
      throw new Error(message)
    }
  }

  return (
    <AppProviders>
      <div className="min-h-screen">
        <AppHeader badge={cycles.at(0)?.label ?? 'Budget'} />
        <main className="page-wrap py-6 sm:py-8">
          {saveError && (
            <div
              role="alert"
              className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-coral/25 bg-coral/8 px-4 py-3"
            >
              <p className="text-sm font-semibold text-coral-deep">
                {saveError}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-coral-deep"
                onClick={() => setSaveError(null)}
              >
                Dismiss
              </Button>
            </div>
          )}
          {cycleNeedsRollover ? (
            <div className="py-20 text-center text-sea-ink-soft">
              {saveError ?? 'Starting your new cycle…'}
            </div>
          ) : (
            <BudgetPage
              cycles={cycles}
              history={history}
              currentCycleId={selectedCycleId ?? cycles.at(0)?.id}
              onCycleChange={setSelectedCycleId}
              onManageIncomeSources={() =>
                navigate({
                  to: '/app/income-sources',
                })
              }
              onSavePlan={savePlan}
            />
          )}
        </main>
      </div>
    </AppProviders>
  )
}
