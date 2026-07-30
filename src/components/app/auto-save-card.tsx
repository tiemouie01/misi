import { Check, Pencil, PiggyBank } from 'lucide-react'
import { useState } from 'react'

import { formatK } from '#/lib/app-data'

export type AutoSaveStatus = 'proposed' | 'saved' | 'dismissed'

interface AutoSaveCardProps {
  status: AutoSaveStatus
  amount: number
  sourceName: string
  onAmountChange: (amount: number) => void
  onConfirm: () => void
  onDismiss: () => void
  animationDelay: string
}

export function AutoSaveCard({
  status,
  amount,
  sourceName,
  onAmountChange,
  onConfirm,
  onDismiss,
  animationDelay,
}: AutoSaveCardProps) {
  const [editing, setEditing] = useState(false)
  const [draftAmount, setDraftAmount] = useState(String(amount))

  if (status === 'dismissed') return null

  if (status === 'saved') {
    return (
      <section
        className="rise-in rounded-3xl border border-lagoon-deep/35 bg-linear-to-r from-lagoon-deep/10 to-palm/10 p-5"
        style={{ animationDelay }}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-full bg-palm/15 text-palm">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <p className="flex-1 text-sm font-bold text-sea-ink">
            Saved{' '}
            <span className="font-mono tabular-nums">{formatK(amount)}</span> to
            Savings
          </p>
          <span className="font-mono text-[0.75rem] text-sea-ink-soft tabular-nums">
            Today
          </span>
        </div>
      </section>
    )
  }

  function confirmEdit() {
    const parsed = Number(draftAmount)
    if (Number.isFinite(parsed) && parsed > 0)
      onAmountChange(Math.round(parsed))
    setEditing(false)
  }

  return (
    <section
      className="rise-in rounded-3xl border border-lagoon-deep/35 bg-linear-to-r from-lagoon-deep/10 to-palm/10 p-6"
      style={{ animationDelay }}
    >
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-lagoon-deep to-palm text-(--btn-text) shadow-md">
          <PiggyBank className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="island-kicker">Auto-save proposed</p>
          <p className="mt-1 text-lg font-extrabold text-sea-ink">
            Auto-save 20% of {sourceName}
          </p>
          <div className="mt-1 text-sm text-sea-ink-soft">
            {editing ? (
              <span className="inline-flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  className="font-mono w-32 rounded-lg border border-(--line) bg-(--chip-bg) px-2 py-1 text-sea-ink tabular-nums"
                  value={draftAmount}
                  onChange={(event) => setDraftAmount(event.target.value)}
                />
                <button
                  type="button"
                  aria-label="Confirm amount"
                  className="grid size-8 place-items-center rounded-full border border-(--chip-line) bg-(--chip-bg) text-palm hover:border-lagoon-deep"
                  onClick={confirmEdit}
                >
                  <Check className="size-4" strokeWidth={3} />
                </button>
              </span>
            ) : (
              <>
                <span className="font-mono font-semibold text-sea-ink tabular-nums">
                  {formatK(amount)}
                </span>{' '}
                → Savings. Proposed when your {sourceName} landed on the 20th.
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          className="btn-primary rounded-full px-5 py-2.5 text-sm font-bold shadow-md"
          onClick={onConfirm}
        >
          Move to Savings
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-(--chip-line) bg-(--chip-bg) px-5 py-2.5 text-sm font-bold text-sea-ink transition hover:border-lagoon-deep"
          onClick={() => {
            setDraftAmount(String(amount))
            setEditing(true)
          }}
        >
          <Pencil className="size-3.5" />
          Edit amount
        </button>
        <button
          type="button"
          className="text-sm font-bold text-sea-ink-soft hover:text-sea-ink"
          onClick={onDismiss}
        >
          Not now
        </button>
      </div>
    </section>
  )
}
