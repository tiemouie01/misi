import { convexQuery } from '@convex-dev/react-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { AppProviders } from '#/components/app/app-providers'
import { BudgetPage } from '#/components/budget'
import { CategoryTransactions } from '#/components/budget/category-transactions'
import { CycleSpendTrend } from '#/components/budget/cycle-spend-trend'
import { errorMessage } from '#/lib/error-message'
import { setIncomeArrivedOptimistically } from '#/lib/optimistic-income'
import { shortDate, toBudgetCycles } from '#/lib/budget-cycles'

import type { Id } from '../../../convex/_generated/dataModel'
import type {
  BudgetHistoryRow,
  BudgetOneOffIncomeUpdate,
  BudgetPlanUpdate,
  BudgetTab,
} from '#/components/budget'

const bootstrapQuery = convexQuery(api.misi.bootstrap, {})
const budgetOverviewQuery = convexQuery(api.misi.budgetOverview, {})

/** Tabs other than "This cycle" live in the URL so they can be linked to. */
const LINKED_VIEWS = ['trends', 'history'] as const

type LinkedView = (typeof LINKED_VIEWS)[number]

export const Route = createFileRoute('/app/budget')({
  validateSearch: (search): { view?: LinkedView } => ({
    view: LINKED_VIEWS.includes(search.view as LinkedView)
      ? (search.view as LinkedView)
      : undefined,
  }),
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

function BudgetRoute() {
  const { now } = Route.useLoaderData()
  const { view: linkedView } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { data: bootstrap } = useSuspenseQuery(bootstrapQuery)
  const { data: overview } = useSuspenseQuery(budgetOverviewQuery)
  const saveCyclePlan = useMutation(api.misi.saveCyclePlan)
  const addOneOffIncome = useMutation(api.misi.addOneOffIncome)
  const updateOneOffIncome = useMutation(api.misi.updateOneOffIncome)
  const removeOneOffIncome = useMutation(api.misi.removeOneOffIncome)
  const setIncomeArrived = useMutation(
    api.misi.setIncomeArrived,
  ).withOptimisticUpdate(setIncomeArrivedOptimistically)
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

  const cycles = useMemo(
    () => toBudgetCycles(overview.cycles, categoriesByKey, now),
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

  function markIncomeArrived(
    cycleId: string,
    sourceId: string,
    arrived: boolean,
  ) {
    setIncomeArrived({
      cycleId: cycleId as Id<'cycles'>,
      sourceId: sourceId as Id<'incomeSources'>,
      arrived,
    }).catch((error) => {
      toast.error(errorMessage(error, 'Unable to update this income'))
    })
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
            defaultTab={linkedView ?? 'current'}
            onTabChange={(tab: BudgetTab) =>
              navigate({
                to: '.',
                search: (prev) => ({
                  ...prev,
                  view: tab === 'current' ? undefined : tab,
                }),
                replace: true,
              })
            }
            onManageIncomeSources={() =>
              navigate({
                to: '.',
                search: (prev) => ({ ...prev, task: 'income-sources' }),
              })
            }
            onSavePlan={savePlan}
            onSaveOneOffIncome={saveOneOffIncome}
            onRemoveOneOffIncome={deleteOneOffIncome}
            onSetIncomeArrived={markIncomeArrived}
            renderSpendChart={(cycle) => (
              <CycleSpendTrend
                cycleId={cycle.id}
                plan={cycle.spendingLimit}
                now={now}
              />
            )}
            renderCategoryTransactions={(slot) => (
              <CategoryTransactions {...slot} now={now} />
            )}
          />
        )}
      </main>
    </AppProviders>
  )
}
