import { useState } from 'react'

import { AccountDraftFields } from '#/components/account-draft-fields'
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
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  canConfirmEnvelopeMove,
  spendingEnvelopeBalance,
} from '../../../shared/savings'
import { formatK } from '#/lib/app-data'
import {
  ACCOUNT_PRESETS,
  draftAccountInput,
  newDraftAccount,
} from '#/lib/onboarding-data'
import { errorMessage } from '#/lib/error-message'
import { cn } from '#/lib/utils'

import type { Account, AllocationDirection } from '#/lib/app-data'
import type { DraftAccount } from '#/lib/onboarding-data'

export type NewAccountInput = ReturnType<typeof draftAccountInput>

/** Moves money between Spending and Savings. Account balances stay put. */
export function MoveMoneyDialog({
  open,
  spendable,
  savingsBalance,
  onOpenChange,
  onMoveSavings,
}: {
  open: boolean
  spendable: number
  savingsBalance: number
  onOpenChange: (open: boolean) => void
  onMoveSavings: (input: {
    amount: number
    direction: AllocationDirection
  }) => Promise<void>
}) {
  const [direction, setDirection] = useState<AllocationDirection>('toSavings')
  const [digits, setDigits] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const amount = Number(digits)
  const spendingEnvelope = spendingEnvelopeBalance(spendable, savingsBalance)
  const nextSpending =
    direction === 'toSavings'
      ? spendingEnvelope - (Number.isFinite(amount) && amount > 0 ? amount : 0)
      : spendingEnvelope
  const cutsIntoSavings = direction === 'toSavings' && nextSpending < 0
  const canConfirm =
    canConfirmEnvelopeMove(amount, direction, savingsBalance) && !busy

  function reset() {
    setDirection('toSavings')
    setDigits('')
    setError(null)
    setBusy(false)
  }

  async function confirm() {
    if (!canConfirm) return
    setError(null)
    setBusy(true)
    try {
      await onMoveSavings({ amount, direction })
      reset()
      onOpenChange(false)
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to move money. Try again.'))
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && busy) return
        if (!nextOpen) reset()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent sheet className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move money</DialogTitle>
          <DialogDescription>
            Choose how much of your money to keep aside in Savings. Your account
            balances don't change.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={direction}
          onValueChange={(value) =>
            setDirection(value === 'toSpending' ? 'toSpending' : 'toSavings')
          }
        >
          <TabsList className="grid h-13 w-full grid-cols-2 sm:h-10">
            <TabsTrigger value="toSavings">Put into Savings</TabsTrigger>
            <TabsTrigger value="toSpending">Take out of Savings</TabsTrigger>
          </TabsList>
        </Tabs>
        <div>
          <Label htmlFor="move-savings-amount">Amount (MWK)</Label>
          <Input
            id="move-savings-amount"
            inputMode="decimal"
            className="mt-2 tabular-nums"
            placeholder="0"
            value={digits}
            onChange={(event) =>
              setDigits(event.target.value.replace(/[^\d.]/g, ''))
            }
          />
          <p
            className={cn(
              'mt-1.5 text-[0.8rem]',
              cutsIntoSavings ||
                (direction === 'toSavings' && spendingEnvelope < 0)
                ? 'font-semibold text-coral-deep'
                : 'text-sea-ink-soft',
            )}
          >
            {direction === 'toSpending' ? (
              <>
                Available:{' '}
                <span className="font-semibold text-sea-ink tabular-nums">
                  {formatK(Math.max(0, savingsBalance))}
                </span>
              </>
            ) : cutsIntoSavings && amount > 0 ? (
              <>
                Spending will be{' '}
                <span className="tabular-nums">{formatK(nextSpending)}</span> —
                cutting into savings.
              </>
            ) : spendingEnvelope < 0 ? (
              <>
                Spending is{' '}
                <span className="tabular-nums">
                  {formatK(spendingEnvelope)}
                </span>{' '}
                — already cutting into savings.
              </>
            ) : (
              <>
                In spending:{' '}
                <span className="font-semibold text-sea-ink tabular-nums">
                  {formatK(spendingEnvelope)}
                </span>
              </>
            )}
          </p>
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
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={() => void confirm()}
          >
            {busy ? 'Moving…' : 'Move money'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Adds an account; also used from Settings. `accounts` should include
 * archived ones, since names stay taken while an account is archived. */
export function AddAccountDialog({
  open,
  accounts,
  onOpenChange,
  onCreateAccount,
}: {
  open: boolean
  accounts: Account[]
  onOpenChange: (open: boolean) => void
  onCreateAccount: (input: NewAccountInput) => Promise<void>
}) {
  const [draft, setDraft] = useState<DraftAccount>(newDraftAccount)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const existingNames = new Set(
    accounts.map((account) => account.name.toLowerCase()),
  )
  const presets = ACCOUNT_PRESETS.filter(
    (preset) => !existingNames.has(preset.name.toLowerCase()),
  )
  const name = draft.name.trim()
  const duplicate = existingNames.has(name.toLowerCase())
  const shownError =
    error ?? (duplicate ? `You already have an account named ${name}.` : null)
  const canSubmit = name !== '' && !duplicate && !busy

  function reset() {
    setDraft(newDraftAccount())
    setError(null)
    setBusy(false)
  }

  async function submit() {
    if (!canSubmit) return
    setError(null)
    setBusy(true)
    try {
      await onCreateAccount(draftAccountInput(draft))
      reset()
      onOpenChange(false)
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to add account. Try again.'))
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && busy) return
        if (!nextOpen) reset()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent sheet className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription>
            Pick a common account or name your own, then enter today's balance.
          </DialogDescription>
        </DialogHeader>
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const selected =
                draft.name.trim().toLowerCase() === preset.name.toLowerCase()
              return (
                <Button
                  key={preset.name}
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={selected}
                  className="hover:translate-y-0 max-sm:h-10 max-sm:px-4 max-sm:text-sm"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      name: preset.name,
                      kind: preset.kind,
                      currency: preset.currency,
                      includeInSpendable: preset.kind !== 'investment',
                    }))
                  }
                >
                  {preset.name}
                </Button>
              )
            })}
          </div>
        )}
        <AccountDraftFields
          account={draft}
          onChange={(patch) =>
            setDraft((current) => ({ ...current, ...patch }))
          }
        />
        {shownError && (
          <p
            role="alert"
            className="rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
          >
            {shownError}
          </p>
        )}
        <DialogFooter sticky>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            {busy ? 'Adding…' : 'Add account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
