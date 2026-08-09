import type { LucideIcon } from 'lucide-react'

export type BudgetGroup = 'needs' | 'wants'

export type BudgetTab = 'current' | 'history'

export type BudgetCategoryStatus =
  'on-track' | 'watch' | 'over-budget' | 'not-started'

export interface BudgetCategoryPlan {
  id: string
  name: string
  group: BudgetGroup
  planned: number
  spent: number
  icon?: LucideIcon
  color?: string
}

export interface BudgetIncomeSourcePlan {
  id: string
  name: string
  planned: number
  actual: number
  status?: 'landed' | 'pending' | 'partial'
  note?: string
  icon?: LucideIcon
}

export interface BudgetCycle {
  id: string
  label: string
  rangeLabel?: string
  expectedIncome: number
  actualIncome?: number
  plannedSavings: number
  actualSavings?: number
  spendingLimit: number
  categories: readonly BudgetCategoryPlan[]
  incomeSources?: readonly BudgetIncomeSourcePlan[]
  daysElapsed?: number
  totalDays?: number
}

export interface BudgetHistoryRow {
  id: string
  label: string
  rangeLabel?: string
  income: number
  needs: number
  wants: number
  savings: number
  spent: number
  surplus: number
}

export interface BudgetPlanUpdate {
  cycleId: string
  spendingLimit: number
  plannedSavings: number
  categoryPlans: Record<string, number>
  incomeSourcePlans: Record<string, number>
}

export interface BudgetPageProps {
  cycles: readonly BudgetCycle[]
  history?: readonly BudgetHistoryRow[]
  currentCycleId?: string
  currency?: string
  defaultTab?: BudgetTab
  className?: string
  onCycleChange?: (cycleId: string) => void
  onTabChange?: (tab: BudgetTab) => void
  onSavePlan?: (update: BudgetPlanUpdate) => void
}
