import { api } from '../../convex/_generated/api'

import type { OptimisticLocalStore } from 'convex/browser'
import type { FunctionArgs } from 'convex/server'

type SetIncomeArrivedArgs = FunctionArgs<typeof api.misi.setIncomeArrived>

/**
 * Shows a hand-ticked arrival straight away. The line counts in full once
 * ticked, never below what is linked to it, matching `arrivedAmountForPlan`.
 */
export function setIncomeArrivedOptimistically(
  localStore: OptimisticLocalStore,
  args: SetIncomeArrivedArgs,
) {
  const overview = localStore.getQuery(api.misi.budgetOverview, {})
  if (!overview) return
  localStore.setQuery(
    api.misi.budgetOverview,
    {},
    {
      ...overview,
      cycles: overview.cycles.map((view) => {
        if (view.cycle._id !== args.cycleId) return view
        let delta = 0
        const incomePlans = view.incomePlans.map((plan) => {
          if (plan.sourceId !== args.sourceId) return plan
          const actualAmount = args.arrived
            ? Math.max(plan.landedAmount, plan.expectedAmount)
            : plan.landedAmount
          delta += actualAmount - plan.actualAmount
          return {
            ...plan,
            actualAmount,
            markedArrived: args.arrived,
            variance: actualAmount - plan.expectedAmount,
          }
        })
        return {
          ...view,
          incomePlans,
          actualIncome: view.actualIncome + delta,
          cashSurplusOrDeficit: view.cashSurplusOrDeficit + delta,
        }
      }),
    },
  )
}
