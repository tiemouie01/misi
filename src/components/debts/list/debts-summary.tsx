import { Card } from '#/components/ui/card'
import { formatK } from '#/lib/app-data'

import type { Debt } from '#/lib/app-data'

function people(count: number) {
  return `${count} ${count === 1 ? 'person' : 'people'}`
}

/** What you owe, straight on the ground, with owed-to-you and counts beside. */
export function DebtsSummary({ debts }: { debts: Debt[] }) {
  const open = debts.filter((debt) => !debt.archived)
  const owing = open.filter((debt) => debt.direction === 'you_owe')
  const owed = open.filter((debt) => debt.direction === 'owed_to_you')
  const youOwe = owing.reduce((sum, debt) => sum + debt.remaining, 0)
  const owedToYou = owed.reduce((sum, debt) => sum + debt.remaining, 0)
  const archivedCount = debts.length - open.length

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <section className="col-span-2 flex flex-col justify-center gap-3 py-1 xl:col-span-1 xl:pr-4">
        <h2 className="text-[0.95rem] font-semibold text-sea-ink-soft">
          You owe in total
        </h2>
        <p className="text-[2.75rem] leading-none font-extrabold tracking-tight tabular-nums sm:text-6xl">
          {formatK(youOwe)}
        </p>
        <p className="text-sm text-sea-ink-soft">
          {youOwe > 0
            ? `To ${people(owing.length)}`
            : "You don't owe anyone right now."}
        </p>
      </section>

      <Card variant="panel" className="gap-1.5 p-4 sm:gap-2 sm:p-5">
        <h2 className="text-sm font-semibold text-sea-ink-soft sm:text-[0.95rem]">
          Owed to you
        </h2>
        <p className="text-2xl leading-tight font-extrabold tabular-nums sm:text-[2rem]">
          {formatK(owedToYou)}
        </p>
        <p className="text-[0.8rem] text-sea-ink-soft sm:text-sm">
          {owedToYou > 0 ? `From ${people(owed.length)}` : 'Nobody owes you'}
        </p>
      </Card>

      <Card variant="panel" className="gap-1.5 p-4 sm:gap-2 sm:p-5">
        <h2 className="text-sm font-semibold text-sea-ink-soft sm:text-[0.95rem]">
          Open debts
        </h2>
        <p className="text-2xl leading-tight font-extrabold tabular-nums sm:text-[2rem]">
          {open.length}
        </p>
        <p className="text-[0.8rem] text-sea-ink-soft sm:text-sm">
          {archivedCount > 0 ? `${archivedCount} archived` : 'None archived'}
        </p>
      </Card>
    </div>
  )
}
