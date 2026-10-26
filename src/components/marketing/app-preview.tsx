import {
  Banknote,
  Bus,
  Landmark,
  ShoppingBasket,
  Smartphone,
  TrendingUp,
} from 'lucide-react'

import { SummaryTiles, spendingPace } from '#/components/app/summary-tiles'
import { Card } from '#/components/ui/card'
import {
  CYCLE,
  accountKindColor,
  accountMwkValue,
  formatAccountAmount,
  formatK,
  seedAccounts,
} from '#/lib/app-data'

const KIND_ICON = {
  bank: Landmark,
  mobile: Smartphone,
  cash: Banknote,
  investment: TrendingUp,
} as const

const TOTAL_SPENT = 214_500
const spendingLeft = CYCLE.spendingLimit - TOTAL_SPENT
const totalInAccounts = seedAccounts.reduce(
  (sum, account) => sum + accountMwkValue(account),
  0,
)

const recentSpending = [
  { icon: Bus, label: 'Bus fare', category: 'Transport', amount: 3_500 },
  { icon: ShoppingBasket, label: 'Market', category: 'Food', amount: 12_000 },
  { icon: Smartphone, label: 'Airtime', category: 'Phone', amount: 2_000 },
]

/** A still copy of the signed-in home screen, filled with sample money, so
 * the landing page shows what people actually get. */
export function AppPreview() {
  return (
    <figure className="rounded-[2rem] border border-white/18 bg-black/8 p-4 shadow-2xl sm:p-6 lg:p-8 dark:bg-black/20">
      <figcaption className="sr-only">
        A preview of the Misi home screen: money left to spend until payday,
        where your money is, and your latest spending.
      </figcaption>

      <div aria-hidden inert>
        <p className="text-sm text-sea-ink-soft">{CYCLE.greetingDate}</p>
        <p className="font-display mt-1 text-[1.75rem] font-bold tracking-tight text-sea-ink sm:text-4xl">
          Good morning, Chikondi
        </p>

        <div className="mt-5 sm:mt-6">
          <SummaryTiles
            spendingLeft={spendingLeft}
            spendingLimit={CYCLE.spendingLimit}
            totalSpent={TOTAL_SPENT}
            perDay={Math.floor(spendingLeft / CYCLE.daysRemaining)}
            daysRemaining={CYCLE.daysRemaining}
            paydayLabel={CYCLE.endsOn}
            pace={spendingPace({
              spendingLimit: CYCLE.spendingLimit,
              totalSpent: TOTAL_SPENT,
              dayNumber: CYCLE.day,
              totalDays: CYCLE.days,
            })}
            totalInAccounts={totalInAccounts}
            accountCount={seedAccounts.length}
            youOwe={0}
            owedToYou={0}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 md:grid-cols-2">
          <Card variant="panel" className="gap-0 p-4 sm:p-5">
            <p className="px-1 text-lg font-bold text-sea-ink">
              Where your money is
            </p>
            <ul className="mt-2 divide-y divide-(--line)">
              {seedAccounts.map((account) => {
                const Icon = KIND_ICON[account.kind]
                const color = accountKindColor(account)
                return (
                  <li
                    key={account.id}
                    className="flex items-center gap-3 px-1 py-2.5"
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-xl"
                      style={{
                        background: `color-mix(in oklab, ${color} 14%, transparent)`,
                        color,
                      }}
                    >
                      <Icon className="size-[1.125rem]" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-sea-ink">
                      {account.name}
                    </span>
                    <span className="font-bold text-sea-ink tabular-nums">
                      {formatAccountAmount(account)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card
            variant="panel"
            className="hidden gap-0 self-start p-4 sm:p-5 md:flex"
          >
            <p className="px-1 text-lg font-bold text-sea-ink">
              Latest spending
            </p>
            <ul className="mt-2 divide-y divide-(--line)">
              {recentSpending.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-3 px-1 py-2.5"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lagoon-deep/10 text-lagoon-deep">
                    <item.icon className="size-[1.125rem]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-sea-ink">
                      {item.label}
                    </span>
                    <span className="block text-[0.8rem] text-sea-ink-soft">
                      {item.category} · Today
                    </span>
                  </span>
                  <span className="font-bold text-sea-ink tabular-nums">
                    -{formatK(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </figure>
  )
}
