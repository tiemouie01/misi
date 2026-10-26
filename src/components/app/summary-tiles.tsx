import { Link } from '@tanstack/react-router'
import { CircleCheck, TriangleAlert } from 'lucide-react'

import { Card } from '#/components/ui/card'
import { Progress } from '#/components/ui/progress'
import { formatK } from '#/lib/app-data'
import { cn } from '#/lib/utils'

export type SpendingPace = 'none' | 'on-track' | 'slow' | 'fast' | 'over'

/** Compares the share of the plan spent with the share of the month gone. */
export function spendingPace({
  spendingLimit,
  totalSpent,
  dayNumber,
  totalDays,
}: {
  spendingLimit: number
  totalSpent: number
  dayNumber: number
  totalDays: number
}): SpendingPace {
  if (spendingLimit <= 0 || totalSpent <= 0) return 'none'
  if (totalSpent > spendingLimit) return 'over'
  const spentPct = (totalSpent / spendingLimit) * 100
  const timePct = (dayNumber / Math.max(1, totalDays)) * 100
  if (spentPct > timePct + 5) return 'fast'
  if (spentPct < timePct - 5) return 'slow'
  return 'on-track'
}

const PACE_COPY: Record<Exclude<SpendingPace, 'none'>, string> = {
  'on-track': 'On track',
  slow: 'Spending slowly',
  fast: 'Spending a bit fast',
  over: 'Over your plan',
}

function PaceChip({ pace }: { pace: SpendingPace }) {
  if (pace === 'none') return null
  const warn = pace === 'fast' || pace === 'over'
  const Icon = warn ? TriangleAlert : CircleCheck
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8rem] font-bold text-sea-ink',
        pace === 'over' ? 'bg-coral/30' : warn ? 'bg-sun/30' : 'bg-lagoon/22',
      )}
    >
      <Icon
        className={cn(
          'size-3.5',
          pace === 'over' ? 'text-coral' : warn ? 'text-sun' : 'text-lagoon',
        )}
        strokeWidth={2.4}
      />
      {PACE_COPY[pace]}
    </span>
  )
}

interface SummaryTilesProps {
  spendingLeft: number
  spendingLimit: number
  totalSpent: number
  perDay: number
  daysRemaining: number
  paydayLabel: string
  pace: SpendingPace
  totalInAccounts: number
  accountCount: number
  youOwe: number
  owedToYou: number
}

export function SummaryTiles({
  spendingLeft,
  spendingLimit,
  totalSpent,
  perDay,
  daysRemaining,
  paydayLabel,
  pace,
  totalInAccounts,
  accountCount,
  youOwe,
  owedToYou,
}: SummaryTilesProps) {
  const hasPlan = spendingLimit > 0

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      {/* The main number sits straight on the app's teal ground, not in a
          card, so it reads first. */}
      <section className="col-span-2 flex flex-col justify-center gap-3 py-1 xl:col-span-1 xl:pr-4">
        <h2 className="text-[0.95rem] font-semibold text-sea-ink-soft">
          Left to spend until payday, {paydayLabel}
        </h2>
        {hasPlan ? (
          <>
            <p className="text-[2.75rem] leading-none font-extrabold tracking-tight sm:text-6xl">
              {formatK(spendingLeft)}
            </p>
            <Progress
              value={Math.min(totalSpent, spendingLimit)}
              max={spendingLimit}
              aria-label="Share of this month's plan spent"
              className="h-2.5 bg-white/16 dark:bg-lagoon-deep/12 [&_[data-slot=progress-indicator]]:bg-none [&_[data-slot=progress-indicator]]:bg-lagoon"
            />
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <p className="text-sm text-sea-ink-soft tabular-nums">
                {formatK(totalSpent)} spent · Plan: {formatK(spendingLimit)}
              </p>
              <PaceChip pace={pace} />
            </div>
          </>
        ) : (
          <>
            <p className="text-[2.75rem] leading-none font-extrabold tracking-tight sm:text-6xl">
              {formatK(0)}
            </p>
            <p className="text-sm text-sea-ink-soft">
              You haven't planned this month's spending yet.{' '}
              <Link
                to="/app/budget"
                className="font-bold text-sea-ink! underline"
              >
                Make a plan
              </Link>
            </p>
          </>
        )}
      </section>

      <Card variant="panel" className="gap-1.5 p-4 sm:gap-2 sm:p-5">
        <h2 className="text-sm font-semibold text-sea-ink-soft sm:text-[0.95rem]">
          You can spend about
        </h2>
        <p className="text-2xl leading-tight font-extrabold sm:text-[2rem]">
          {formatK(perDay)}{' '}
          <span className="text-sm font-bold text-sea-ink-soft sm:text-base">
            a day
          </span>
        </p>
        <p className="text-[0.8rem] text-sea-ink-soft sm:text-sm">
          {daysRemaining > 1
            ? `for the next ${daysRemaining} days`
            : daysRemaining === 1
              ? 'for the last day'
              : 'Payday is today'}
        </p>
      </Card>

      <Card variant="panel" className="gap-1.5 p-4 sm:gap-2 sm:p-5">
        <h2 className="text-sm font-semibold text-sea-ink-soft sm:text-[0.95rem]">
          Total in your accounts
        </h2>
        <p className="text-2xl leading-tight font-extrabold sm:text-[2rem]">
          {formatK(totalInAccounts)}
        </p>
        <p className="text-[0.8rem] text-sea-ink-soft sm:text-sm">
          {youOwe > 0
            ? `You owe ${formatK(youOwe)}`
            : owedToYou > 0
              ? `Owed to you ${formatK(owedToYou)}`
              : `In ${accountCount} ${accountCount === 1 ? 'account' : 'accounts'}`}
        </p>
      </Card>
    </div>
  )
}
