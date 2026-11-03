import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useHydrated } from '@tanstack/react-router'

import { api } from '../../../convex/_generated/api'
import { cycleSpend } from '../../../shared/cycle-spend'
import { spendingPace } from '#/components/app/summary-tiles'
import {
  CycleSpendChart,
  paceSentence,
} from '#/components/charts/cycle-spend-chart'

import type { Id } from '../../../convex/_generated/dataModel'

/** A cycle's spending chart and the sentence that reads it, for Trends. */
export function CycleSpendTrend({
  cycleId,
  plan,
  now,
}: {
  cycleId: string
  plan: number
  now: number
}) {
  const { data } = useQuery(
    convexQuery(api.misi.cycleSpending, { cycleId: cycleId as Id<'cycles'> }),
  )
  // The server never has this query's data, so wait for hydration to match.
  const hydrated = useHydrated()
  if (!data || !hydrated) return <div className="h-64" aria-busy="true" />
  if (plan <= 0) {
    return (
      <p className="px-1 text-sm text-sea-ink-soft">
        {data.endsAt < now
          ? 'No spending plan was set for this cycle.'
          : 'Plan this cycle’s spending to see how it’s going.'}
      </p>
    )
  }

  const spend = cycleSpend({ ...data, now })
  const closed = data.endsAt < now
  const pace = spendingPace({
    spendingLimit: plan,
    totalSpent: spend.cumulative.at(-1) ?? 0,
    dayNumber: spend.today + 1,
    totalDays: spend.totalDays,
  })

  return (
    <div className="grid gap-3 px-1">
      <p className="text-sm text-sea-ink">
        {paceSentence({ spend, plan, closed })}
      </p>
      <CycleSpendChart
        spend={spend}
        plan={plan}
        closed={closed}
        tone={
          pace === 'over'
            ? 'over'
            : pace === 'fast' && !closed
              ? 'fast'
              : 'calm'
        }
      />
    </div>
  )
}
