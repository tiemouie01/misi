import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

import { Card } from '#/components/ui/card'
import { formatK } from '#/lib/app-data'

export interface PulseIncomeSource {
  id: string
  name: string
  expectedAmount: number
  expectedAmountMax?: number
  landedAmount: number
  status: 'landed' | 'partial' | 'pending'
}

interface CyclePulseCardProps {
  cycleLabel: string
  spendingLimit: number
  totalSpent: number
  spendingLeft: number
  perDay: number
  dayNumber: number
  totalDays: number
  incomeSources: PulseIncomeSource[]
  animationDelay: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function PulseRow({
  to,
  search,
  label,
  value,
  children,
}: {
  to: '/app' | '/app/budget'
  search?: { task: 'income-sources' | 'reconcile' }
  label: string
  value: string
  children?: React.ReactNode
}) {
  return (
    <Link
      to={to}
      search={search}
      className="group -mx-2 block rounded-xl px-2 py-2.5 no-underline transition-colors hover:bg-(--chip-bg)"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-sea-ink">{label}</span>
        <span className="flex items-center gap-1">
          <span className="font-mono text-[0.8rem] font-semibold text-sea-ink tabular-nums">
            {value}
          </span>
          <ChevronRight className="size-3.5 text-sea-ink-soft transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      {children}
    </Link>
  )
}

export function CyclePulseCard({
  cycleLabel,
  spendingLimit,
  totalSpent,
  spendingLeft,
  perDay,
  dayNumber,
  totalDays,
  incomeSources,
  animationDelay,
}: CyclePulseCardProps) {
  const safeLimit = Math.max(0, spendingLimit)
  const safeTotalDays = Math.max(1, totalDays)
  const spentPct =
    safeLimit > 0 ? Math.round((Math.max(0, totalSpent) / safeLimit) * 100) : 0
  const pacePct = Math.round((clamp(dayNumber, 0, safeTotalDays) / safeTotalDays) * 100)
  const paceStatus =
    safeLimit <= 0
      ? 'No spending limit set'
      : totalSpent <= 0
        ? 'No spending yet'
        : spentPct > pacePct + 5
          ? 'Spending faster than plan'
          : spentPct < pacePct - 5
            ? 'Spending slower than plan'
            : 'On pace'

  const incomeLanded = incomeSources.reduce(
    (sum, source) => sum + Math.max(0, source.landedAmount),
    0,
  )
  const incomeExpected = incomeSources.reduce(
    (sum, source) => sum + Math.max(0, source.expectedAmount),
    0,
  )
  const landedCount = incomeSources.filter(
    (source) => source.status === 'landed',
  ).length

  return (
    <Card
      variant="island"
      className="rise-in gap-0 rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="island-kicker">This cycle</p>
        <span className="font-mono text-[0.72rem] font-semibold text-sea-ink-soft">
          {cycleLabel}
        </span>
      </div>
      <div className="mt-3 divide-y divide-(--line)">
        <PulseRow
          to="/app/budget"
          label="Spending"
          value={`${formatK(spendingLeft)} left`}
        >
          <div className="relative mt-2">
            <div
              role="progressbar"
              aria-label="Cycle budget spent"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={spentPct}
              aria-valuetext={`${spentPct}% spent`}
              className="h-1.5 overflow-hidden rounded-full bg-(--line)"
            >
              <div
                className="h-full rounded-full bg-linear-to-r from-lagoon-deep to-lagoon"
                style={{ width: `${Math.min(spentPct, 100)}%` }}
              />
            </div>
            <span
              className="absolute -inset-y-0.5 w-0.5 rounded bg-sea-ink/50"
              style={{ left: `${pacePct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[0.75rem] text-sea-ink-soft">
            {spentPct}% spent · {paceStatus} ·{' '}
            <span className="font-mono tabular-nums">{formatK(perDay)}</span>
            /day
          </p>
        </PulseRow>
        <PulseRow
          to="/app"
          search={{ task: 'income-sources' }}
          label="Income"
          value={`${formatK(incomeLanded)} of ${formatK(incomeExpected)}`}
        >
          <div className="mt-2 flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              {incomeSources.map((source) => (
                <span
                  key={source.id}
                  title={`${source.name} — ${source.status}`}
                  className="size-2 rounded-full"
                  style={{
                    background:
                      source.status === 'landed'
                        ? 'var(--palm)'
                        : source.status === 'partial'
                          ? 'var(--lagoon)'
                          : 'var(--coral)',
                  }}
                />
              ))}
            </span>
            <span className="text-[0.75rem] text-sea-ink-soft">
              {incomeSources.length === 0
                ? 'No income sources yet'
                : `${landedCount} of ${incomeSources.length} sources landed`}
            </span>
          </div>
        </PulseRow>
        <PulseRow
          to="/app"
          search={{ task: 'reconcile' }}
          label="Reconcile"
          value="Check balances"
        >
          <p className="mt-1.5 text-[0.75rem] text-sea-ink-soft">
            Does Misi agree with reality?
          </p>
        </PulseRow>
      </div>
    </Card>
  )
}
