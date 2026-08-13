import { usePowerSync } from '@powersync/react'
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { AppHeader } from '#/components/app/app-header'
import { BudgetPage } from '#/components/budget'
import { Button } from '#/components/ui/button'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'
import { useLocalBootstrap, useLocalBudgetOverview } from '#/lib/local/reads'
import { saveCyclePlan } from '#/lib/local/writes'

import type {
  BudgetCycle,
  BudgetHistoryRow,
  BudgetPlanUpdate,
} from '#/components/budget'

const DAY_MS = 86_400_000

export const Route = createFileRoute('/app/budget')({
  loader: () => ({ now: Date.now() }),
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
  return <BudgetRouteContent now={now} />
}

function BudgetRouteContent({ now }: { now: number }) {
  const navigate = useNavigate({ from: Route.fullPath })
  const db = usePowerSync()
  const { isLoading: bootstrapLoading, data: bootstrap } = useLocalBootstrap()
  const { isLoading: overviewLoading, data: overview } =
    useLocalBudgetOverview()
  const ensureSeedData = useMutation(api.misi.ensureSeedData)
  const [selectedCycleId, setSelectedCycleId] = useState<string>()
  const [saveError, setSaveError] = useState<string | null>(null)
  const requestedRollover = useRef(false)
  const isLoading = bootstrapLoading || overviewLoading
  const cycleNeedsRollover =
    bootstrap?.currentCycle != null && bootstrap.currentCycle.endsAt < now

  useEffect(() => {
    if (!cycleNeedsRollover || requestedRollover.current) return
    requestedRollover.current = true
    void ensureSeedData({}).catch((error) => {
      requestedRollover.current = false
      setSaveError(errorMessage(error, 'Unable to start the new cycle'))
    })
  }, [cycleNeedsRollover, ensureSeedData])

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
          daysElapsed,
          totalDays,
          categories: view.categoryRows.map((row) => {
            const category = categoriesByKey.get(row.categoryId)
            return {
              id: row.categoryId,
              name: row.categoryName,
              group: row.budgetGroup,
              planned: row.plannedAmount,
              spent: row.actualAmount,
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
      await saveCyclePlan(db, {
        cycleUuid: update.cycleId,
        spendingLimit: update.spendingLimit,
        categoryPlans: [...update.categoryPlans],
        incomePlans: update.incomePlans?.map((plan) => ({
          sourceId: plan.sourceId,
          expectedAmount: plan.expectedAmount,
          expectedAmountMax: plan.expectedAmountMax,
          savingsRate: plan.savingsRate,
        })),
      })
    } catch (error) {
      const message = errorMessage(error, 'Unable to save this cycle plan')
      setSaveError(message)
      throw new Error(message)
    }
  }

  if (!isLoading && (bootstrap === null || !bootstrap.settings?.onboardedAt)) {
    return <Navigate to="/onboarding" />
  }

  return (
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
        {isLoading || cycleNeedsRollover ? (
          <div className="py-20 text-center text-sea-ink-soft">
            {saveError ??
              (isLoading ? 'Loading…' : 'Starting your new cycle…')}
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
  )
}
