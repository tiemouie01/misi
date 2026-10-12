import { useState } from 'react'

import { buildPlanUpdate, createDraft } from './budget'

import type {
  BudgetCycleData,
  BudgetDraft,
  BudgetPlanUpdate,
  BudgetTab,
} from './budget'

export interface UseBudgetPageOptions<TCycle extends BudgetCycleData> {
  cycles: readonly TCycle[]
  currentCycleId?: string
  defaultTab?: BudgetTab
  onTabChange?: (tab: BudgetTab) => void
  onSavePlan?: (update: BudgetPlanUpdate) => void | Promise<void>
}

/** Cycle selection, tab and plan-editing state for the budget screen. */
export function useBudgetPage<TCycle extends BudgetCycleData>({
  cycles,
  currentCycleId,
  defaultTab = 'current',
  onTabChange,
  onSavePlan,
}: UseBudgetPageOptions<TCycle>) {
  const selectedCycle =
    cycles.find((cycle) => cycle.id === currentCycleId) ?? cycles.at(0)
  const [activeTab, setActiveTab] = useState<BudgetTab>(defaultTab)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState<BudgetDraft | undefined>()

  const openEdit = () => {
    if (!selectedCycle || selectedCycle.isClosed) return
    setDraft(createDraft(selectedCycle))
    setDialogOpen(true)
  }

  /** Accepts any string so platform tab controls can pass their raw value. */
  const changeTab = (value: string) => {
    if (value !== 'current' && value !== 'history') return
    const nextTab = value
    setActiveTab(nextTab)
    onTabChange?.(nextTab)
  }

  const savePlan = async (update: BudgetPlanUpdate) => {
    await onSavePlan?.(update)
    setDialogOpen(false)
  }

  return {
    selectedCycle,
    activeTab,
    changeTab,
    dialogOpen,
    setDialogOpen,
    draft,
    setDraft,
    openEdit,
    savePlan,
  }
}

export interface UseBudgetPlanEditorOptions {
  cycle: BudgetCycleData
  currency: string
  onOpenChange: (open: boolean) => void
  onSave: (update: BudgetPlanUpdate) => void | Promise<void>
}

/** Save status, validation and close guarding for the plan editor. */
export function useBudgetPlanEditor({
  cycle,
  currency,
  onOpenChange,
  onSave,
}: UseBudgetPlanEditorOptions) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const submit = async (draft: BudgetDraft) => {
    const result = buildPlanUpdate(cycle, draft, currency)
    if (!result.ok) {
      setSaveError(result.error)
      return
    }

    setSaveError(null)
    setSaving(true)
    try {
      await onSave(result.update)
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Unable to save this cycle plan.',
      )
    } finally {
      setSaving(false)
    }
  }

  /** Ignored while saving so the editor can't close mid-request. */
  const requestOpenChange = (nextOpen: boolean) => {
    if (saving) return
    setSaveError(null)
    onOpenChange(nextOpen)
  }

  return { saving, saveError, submit, requestOpenChange }
}
