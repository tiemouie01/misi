import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, useHydrated } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'

import { api } from '../../../convex/_generated/api'
import { BudgetTrends } from '#/components/budget'
import { CycleSpendTrend } from '#/components/budget/cycle-spend-trend'
import { toBudgetCycles } from '#/lib/budget-cycles'

import type { FunctionReturnType } from 'convex/server'

type Category = NonNullable<
  FunctionReturnType<typeof api.misi.bootstrap>
>['categories'][number]

/** The current cycle's trends, as the home page's third view on phones. */
export function HomeTrends({
  categories,
  now,
}: {
  categories: readonly Category[]
  now: number
}) {
  const hydrated = useHydrated()
  const { data: overview } = useQuery(convexQuery(api.misi.budgetOverview, {}))
  const cycle = useMemo(() => {
    const current = overview?.cycles.at(0)
    if (!current) return undefined
    const byKey = new Map(
      categories.map((category) => [category.key, category]),
    )
    return toBudgetCycles([current], byKey, now)[0]
  }, [categories, now, overview])

  // The server never has this query's data, so wait for hydration to match.
  if (!hydrated || !cycle) return <div className="h-64" aria-busy="true" />

  return (
    <div className="grid gap-4">
      <BudgetTrends
        cycle={cycle}
        currency="K"
        spendChart={
          <CycleSpendTrend
            cycleId={cycle.id}
            plan={cycle.spendingLimit}
            now={now}
          />
        }
      />
      <Link
        to="/app/budget"
        search={{ view: 'trends' }}
        className="inline-flex items-center gap-1.5 justify-self-start px-1 text-sm font-bold text-sea-ink hover:underline"
      >
        Past cycles’ trends
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  )
}
