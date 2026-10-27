import { useState } from 'react'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { errorMessage } from '#/lib/error-message'

import type { FormEvent } from 'react'
import type { BudgetIncomeSourcePlan, BudgetOneOffIncomeUpdate } from './types'

type OneOffIncomeInput = Omit<BudgetOneOffIncomeUpdate, 'cycleId' | 'id'>

/** Adds or edits income expected this cycle only, e.g. a side job or a gift. */
export function OneOffIncomeDialog({
  open,
  income,
  cycleLabel,
  currency,
  onOpenChange,
  onSave,
  onRemove,
}: {
  open: boolean
  /** The line being edited; omitted to add a new one. */
  income?: BudgetIncomeSourcePlan
  cycleLabel: string
  currency: string
  onOpenChange: (open: boolean) => void
  onSave: (input: OneOffIncomeInput) => Promise<void>
  onRemove?: () => Promise<void>
}) {
  const [name, setName] = useState(income?.name ?? '')
  const [amount, setAmount] = useState(
    income ? String(Math.round(income.expectedAmount)) : '',
  )
  const [day, setDay] = useState(
    income?.expectedDay === undefined ? '' : String(income.expectedDay),
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const expectedAmount = Number(amount)
  const expectedDay = day.trim() ? Number(day) : undefined
  const dayValid =
    expectedDay === undefined ||
    (Number.isInteger(expectedDay) && expectedDay >= 1 && expectedDay <= 31)
  const canSave =
    !busy &&
    name.trim() !== '' &&
    Number.isFinite(expectedAmount) &&
    expectedAmount > 0 &&
    dayValid

  async function run(action: () => Promise<void>, fallback: string) {
    setError(null)
    setBusy(true)
    try {
      await action()
      onOpenChange(false)
    } catch (caught) {
      setError(errorMessage(caught, fallback))
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return
    void run(
      () => onSave({ name: name.trim(), expectedAmount, expectedDay }),
      'Unable to save this income. Try again.',
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && busy) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent sheet className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {income ? 'Edit one-off income' : 'Add one-off income'}
          </DialogTitle>
          <DialogDescription>
            Money you expect in {cycleLabel} only, like a side job or a gift. It
            counts toward this cycle&apos;s income and won&apos;t repeat next
            cycle.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <Label htmlFor="one-off-income-name">Name</Label>
            <Input
              id="one-off-income-name"
              className="mt-2"
              placeholder="e.g. Freelance job"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="one-off-income-amount">Amount ({currency})</Label>
              <Input
                id="one-off-income-amount"
                inputMode="numeric"
                className="font-mono mt-2 tabular-nums"
                placeholder="0"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/[^\d.]/g, ''))
                }
              />
            </div>
            <div>
              <Label htmlFor="one-off-income-day">Day (optional)</Label>
              <Input
                id="one-off-income-day"
                inputMode="numeric"
                className="font-mono mt-2 tabular-nums"
                placeholder="Any"
                aria-invalid={!dayValid}
                value={day}
                onChange={(event) =>
                  setDay(event.target.value.replace(/\D/g, ''))
                }
              />
            </div>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
            >
              {error}
            </p>
          )}
          <DialogFooter sticky>
            {income && onRemove ? (
              <Button
                type="button"
                variant="ghost"
                className="text-coral-deep sm:mr-auto"
                disabled={busy}
                onClick={() =>
                  void run(onRemove, 'Unable to remove this income. Try again.')
                }
              >
                Remove
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {busy ? 'Saving…' : income ? 'Save' : 'Add income'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
