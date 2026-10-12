import type { LucideIcon } from 'lucide-react'
import type {
  BudgetCategoryData,
  BudgetCycleData,
  BudgetHistoryRow,
  BudgetIncomeSourceData,
  BudgetPlanUpdate,
  BudgetTab,
} from '#/hooks/budget'

export type {
  BudgetCategoryPlanUpdate,
  BudgetCategoryStatus,
  BudgetGroup,
  BudgetHistoryRow,
  BudgetIncomePlanUpdate,
  BudgetPlanUpdate,
  BudgetTab,
} from '#/hooks/budget'

export interface BudgetCategoryPlan extends BudgetCategoryData {
  icon?: LucideIcon
}

export interface BudgetIncomeSourcePlan extends BudgetIncomeSourceData {
  icon?: LucideIcon
}

export interface BudgetCycle extends BudgetCycleData {
  categories: readonly BudgetCategoryPlan[]
  incomeSources?: readonly BudgetIncomeSourcePlan[]
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
