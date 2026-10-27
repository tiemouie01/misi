import { convexQuery } from '@convex-dev/react-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { incomeSourceStatus } from '../../../shared/income'
import { AppProviders } from '#/components/app/app-providers'
import { BudgetPage } from '#/components/budget'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'
import { errorMessage } from '#/lib/error-message'

import type { Id } from '../../../convex/_generated/dataModel'
import type {
  BudgetCycle,
  BudgetHistoryRow,
  BudgetOneOffIncomeUpdate,
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

const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Africa/Blantyre',
})

function shortDate(timestamp: number) {
  return shortDateFormat.format(new Date(timestamp))
}

function expectedWindow(start: number, end: number) {
  if (start === end) return `Expected on day ${start}`
  return `Expected days ${start}–${end}`
}

/** One-offs store "any day" as the whole month, days 1–31. */
function oneOffExpectedDay(start: number, end: number) {
  return start === end ? start : undefined
}

function BudgetRoute() {
  const { now } = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { data: bootstrap } = useSuspenseQuery(bootstrapQuery)
  const { data: overview } = useSuspenseQuery(budgetOverviewQuery)
  const saveCyclePlan = useMutation(api.misi.saveCyclePlan)
  const addOneOffIncome = useMutation(api.misi.addOneOffIncome)
  const updateOneOffIncome = useMutation(api.misi.updateOneOffIncome)
  const removeOneOffIncome = useMutation(api.misi.removeOneOffIncome)
  const ensureSeedData = useMutation(api.misi.ensureSeedData)
  const [selectedCycleId, setSelectedCycleId] = useState<string>()
  const [rolloverError, setRolloverError] = useState<string | null>(null)
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
        const message = errorMessage(error, 'Unable to start the new cycle')
        setRolloverError(message)
        toast.error(message)
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
          expectedIncome: view.expectedIncome,
          actualIncome: view.actualIncome,
          unassignedIncome: view.unassignedIncome,
          investmentIncome: view.investmentIncome,
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
          incomeSources: view.incomePlans.map((source) => {
            const expectedDay = source.oneOff
              ? oneOffExpectedDay(
                  source.expectedDayStart,
                  source.expectedDayEnd,
                )
              : undefined
            return {
              id: source.sourceId,
              name: source.sourceName,
              expectedAmount: source.expectedAmount,
              expectedAmountMax: source.expectedAmountMax,
              actualAmount: source.actualAmount,
              savingsRate: source.savingsRate,
              status: incomeSourceStatus(
                source.actualAmount,
                source.expectedAmount,
              ),
              note: source.oneOff
                ? expectedDay === undefined
                  ? 'One-off, this cycle only'
                  : `One-off · expected on day ${expectedDay}`
                : expectedWindow(
                    source.expectedDayStart,
                    source.expectedDayEnd,
                  ),
              oneOff: source.oneOff,
              expectedDay,
            }
          }),
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
      toast.success('Plan saved')
    } catch (error) {
      const message = errorMessage(error, 'Unable to save this cycle plan')
      toast.error(message)
      throw new Error(message)
    }
  }

  async function refreshBudget() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: budgetOverviewQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: bootstrapQuery.queryKey }),
    ])
  }

  async function saveOneOffIncome(update: BudgetOneOffIncomeUpdate) {
    const input = {
      name: update.name,
      expectedAmount: update.expectedAmount,
      expectedDay: update.expectedDay,
    }
    if (update.id) {
      await updateOneOffIncome({
        sourceId: update.id as Id<'incomeSources'>,
        ...input,
      })
    } else {
      await addOneOffIncome({
        cycleId: update.cycleId as Id<'cycles'>,
        ...input,
      })
    }
    await refreshBudget()
    toast.success(update.id ? 'One-off income updated' : 'One-off income added')
  }

  async function deleteOneOffIncome(id: string) {
    await removeOneOffIncome({ sourceId: id as Id<'incomeSources'> })
    await refreshBudget()
    toast.success('One-off income removed')
  }

  return (
    <AppProviders>
      <main className="page-wrap py-6 sm:py-8">
        {cycleNeedsRollover ? (
          <p className="py-20 text-center text-sea-ink-soft">
            {rolloverError ?? 'Starting your new cycle…'}
          </p>
        ) : (
          <BudgetPage
            cycles={cycles}
            history={history}
            currentCycleId={selectedCycleId ?? cycles.at(0)?.id}
            onCycleChange={setSelectedCycleId}
            onManageIncomeSources={() =>
              navigate({
                to: '.',
                search: (prev) => ({ ...prev, task: 'income-sources' }),
              })
            }
            onSavePlan={savePlan}
            onSaveOneOffIncome={saveOneOffIncome}
            onRemoveOneOffIncome={deleteOneOffIncome}
          />
        )}
      </main>
    </AppProviders>
  )
}
