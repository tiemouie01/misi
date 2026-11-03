import { incomeSourceStatus } from '../../shared/income'
import { resolveCategoryColor, resolveCategoryIcon } from '#/lib/categories'

import type { FunctionReturnType } from 'convex/server'
import type { api } from '../../convex/_generated/api'
import type { BudgetCycle } from '#/components/budget'

const DAY_MS = 86_400_000

type CycleView = FunctionReturnType<
  typeof api.misi.budgetOverview
>['cycles'][number]
type Category = NonNullable<
  FunctionReturnType<typeof api.misi.bootstrap>
>['categories'][number]

const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Africa/Blantyre',
})

export function shortDate(timestamp: number) {
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

/** The budget overview's cycles, shaped for the budget components. */
export function toBudgetCycles(
  views: readonly CycleView[],
  categoriesByKey: ReadonlyMap<string, Category>,
  now: number,
): BudgetCycle[] {
  return views.map((view) => {
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
            color: category ? resolveCategoryColor(category.color) : undefined,
          }
        }),
      incomeSources: view.incomePlans.map((source) => {
        const expectedDay = source.oneOff
          ? oneOffExpectedDay(source.expectedDayStart, source.expectedDayEnd)
          : undefined
        return {
          id: source.sourceId,
          name: source.sourceName,
          expectedAmount: source.expectedAmount,
          expectedAmountMax: source.expectedAmountMax,
          actualAmount: source.actualAmount,
          landedAmount: source.landedAmount,
          markedArrived: source.markedArrived,
          savingsRate: source.savingsRate,
          status: incomeSourceStatus(
            source.actualAmount,
            source.expectedAmount,
            source.markedArrived,
          ),
          note: source.oneOff
            ? expectedDay === undefined
              ? 'One-off, this cycle only'
              : `One-off · expected on day ${expectedDay}`
            : expectedWindow(source.expectedDayStart, source.expectedDayEnd),
          oneOff: source.oneOff,
          expectedDay,
        }
      }),
    }
  })
}
