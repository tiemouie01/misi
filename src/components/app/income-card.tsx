import { Check, Clock } from 'lucide-react'
import { useState } from 'react'

import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { incomeSources } from '#/lib/app-data'

interface IncomeCardProps {
  animationDelay: string
}

export function IncomeCard({ animationDelay }: IncomeCardProps) {
  const [showNote, setShowNote] = useState(false)

  return (
    <Card
      variant="island"
      className="rise-in gap-0 rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="island-kicker">Expected income</p>
        <span className="font-mono text-[0.72rem] font-semibold text-sea-ink-soft">
          Jul cycle
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        {incomeSources.map((source) => (
          <div
            key={source.id}
            className="flex items-center gap-3 rounded-xl border border-(--line) bg-(--chip-bg) px-3.5 py-3"
          >
            <span
              className={
                source.status === 'landed'
                  ? 'grid size-6 shrink-0 place-items-center rounded-full bg-palm/15 text-palm'
                  : 'grid size-6 shrink-0 place-items-center rounded-full bg-[#d96a4e]/12 text-[#c05a40]'
              }
            >
              {source.status === 'landed' ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : (
                <Clock className="size-3.5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-sea-ink">{source.name}</p>
              <p className="text-[0.75rem] text-sea-ink-soft">
                Expected {source.expected}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-[0.8rem] font-semibold text-sea-ink tabular-nums">
                {source.amountLabel}
              </p>
              <p
                className={
                  source.status === 'landed'
                    ? 'text-[0.72rem] font-semibold text-palm'
                    : 'text-[0.72rem] font-semibold text-[#c05a40]'
                }
              >
                {source.statusNote}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[0.8rem] leading-relaxed text-sea-ink-soft">
        Each source carries its own savings split — salary 20%, allowance 50%.
        Log income with + and Misi proposes the transfer.
      </p>
      <Button
        type="button"
        variant="secondary"
        className="mt-3.5 self-start"
        onClick={() => setShowNote(true)}
      >
        + Add income source
      </Button>
      {showNote && (
        <p className="mt-2 text-[0.78rem] text-sea-ink-soft italic">
          Setup flows arrive with the backend — this prototype uses sample data.
        </p>
      )}
    </Card>
  )
}
