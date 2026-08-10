import { Check, Clock } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { formatK } from '#/lib/app-data'

import type { IncomeSource } from '#/lib/app-data'

interface IncomeCardProps {
  sources: IncomeSource[]
  cycleLabel: string
  animationDelay: string
  onAddIncomeSource?: () => void
}

function expectedAmountLabel(source: IncomeSource) {
  const minimum = Math.max(0, source.expectedAmount)
  const maximum = source.expectedAmountMax
  if (maximum !== undefined && maximum > minimum) {
    return `${formatK(minimum)}–${formatK(maximum)}`
  }
  return formatK(minimum)
}

function savingsRateLabel(rate: number) {
  return `${Math.round(Math.max(0, rate) * 100)}% savings`
}

export function IncomeCard({
  sources,
  cycleLabel,
  animationDelay,
  onAddIncomeSource,
}: IncomeCardProps) {
  const expectedTotal = sources.reduce(
    (sum, source) => sum + Math.max(0, source.expectedAmount),
    0,
  )
  const expectedMaximumTotal = sources.reduce(
    (sum, source) =>
      sum + Math.max(0, source.expectedAmountMax ?? source.expectedAmount),
    0,
  )
  const landedTotal = sources.reduce(
    (sum, source) => sum + Math.max(0, source.landedAmount),
    0,
  )
  const expectedLabel =
    expectedMaximumTotal > expectedTotal
      ? `${formatK(expectedTotal)}–${formatK(expectedMaximumTotal)}`
      : formatK(expectedTotal)

  return (
    <Card
      variant="island"
      className="rise-in gap-0 rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="island-kicker">Expected income</p>
        <span className="font-mono text-[0.72rem] font-semibold text-sea-ink-soft">
          {cycleLabel}
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="text-sm text-sea-ink-soft">
          Expected{' '}
          <span className="font-mono font-semibold text-sea-ink">
            {expectedLabel}
          </span>
        </p>
        <p className="text-right text-sm text-sea-ink-soft">
          Landed{' '}
          <span className="font-mono font-semibold text-sea-ink">
            {formatK(landedTotal)}
          </span>
        </p>
      </div>
      <div className="mt-4 space-y-2.5">
        {sources.length === 0 ? (
          <p className="rounded-xl border border-dashed border-(--chip-line) px-3.5 py-4 text-sm text-sea-ink-soft">
            Add an income source to track expected landings and savings splits.
          </p>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center gap-3 rounded-xl border border-(--line) bg-(--chip-bg) px-3.5 py-3"
            >
              <span
                className={
                  source.status === 'landed'
                    ? 'grid size-6 shrink-0 place-items-center rounded-full bg-palm/15 text-palm'
                    : 'grid size-6 shrink-0 place-items-center rounded-full bg-coral/12 text-coral-deep'
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
                  {expectedAmountLabel(source)} · {source.expectedWindow}
                </p>
                <p className="text-[0.72rem] font-semibold text-sea-ink-soft">
                  {savingsRateLabel(source.savingsRate)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[0.8rem] font-semibold text-sea-ink tabular-nums">
                  {formatK(source.landedAmount)} landed
                </p>
                <p
                  className={
                    source.status === 'landed'
                      ? 'text-[0.72rem] font-semibold text-palm'
                      : 'text-[0.72rem] font-semibold text-coral-deep'
                  }
                >
                  {source.statusNote}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="mt-4 text-[0.8rem] leading-relaxed text-sea-ink-soft">
        Each source carries its own savings split. Log income with + and Misi
        proposes the matching transfer.
      </p>
      <Button
        type="button"
        variant="secondary"
        className="mt-3.5 self-start"
        onClick={onAddIncomeSource}
      >
        Manage income plan
      </Button>
    </Card>
  )
}
