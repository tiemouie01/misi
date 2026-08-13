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
  previousSpent?: number
  icon?: LucideIcon
  color?: string
}

export interface BudgetIncomeSourcePlan {
  id: string
  name: string
  expectedAmount: number
  expectedAmountMax?: number
  actualAmount: number
  savingsRate: number
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
  actualSavings?: number
  actualSpending?: number
  isClosed?: boolean
  spendingLimit: number
  categories: readonly BudgetCategoryPlan[]
  incomeSources?: readonly BudgetIncomeSourcePlan[]
  daysElapsed?: number
  totalDays?: number
  previousActualSpending?: number
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
  categoryPlans: readonly BudgetCategoryPlanUpdate[]
  incomePlans?: readonly BudgetIncomePlanUpdate[]
}

export interface BudgetCategoryPlanUpdate {
  categoryId: string
  plannedAmount: number
}

export interface BudgetIncomePlanUpdate {
  sourceId: string
  expectedAmount: number
  expectedAmountMax?: number
  savingsRate: number
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
  onManageIncomeSources?: () => void
  onSavePlan?: (update: BudgetPlanUpdate) => void | Promise<void>
}
