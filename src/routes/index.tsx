import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Droplets,
  Layers,
  PiggyBank,
  Scale,
  Sprout,
  WifiOff,
  Zap,
} from 'lucide-react'

import { MisiMark } from '#/components/misi-mark'
import { ThemeToggle } from '#/components/theme-toggle'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  CYCLE,
  USD_RATE,
  accountKindColor,
  accountMwkValue,
  formatAccountAmount,
  formatK,
  seedAccounts,
  seedReconcile,
} from '#/lib/app-data'

export const Route = createFileRoute('/')({ component: Home })

const largestAccount = Math.max(
  ...seedAccounts.map((account) => accountMwkValue(account)),
  1,
)

const accounts = seedAccounts.map((account) => ({
  name: account.name,
  amount: formatAccountAmount(account),
  pct: `${Math.max(8, Math.round((accountMwkValue(account) / largestAccount) * 100))}%`,
  color: accountKindColor(account),
}))

const netWorth = seedAccounts.reduce(
  (sum, account) => sum + accountMwkValue(account),
  0,
)

const features = [
  {
    icon: Zap,
    title: 'Entry speed above all',
    body: 'Logging takes under 10 seconds. Amount-first numpad, smart defaults, and one-tap recents for your most frequent expenses.',
  },
  {
    icon: Scale,
    title: 'Reality-first reconciliation',
    body: 'Misi computes what every account should hold. You check the real balance; any drift becomes a guided fix, not a spreadsheet chore.',
  },
  {
    icon: Layers,
    title: 'Allocation ≠ location',
    body: 'Where money sits (banks, mobile money, cash) and what it\u2019s for (wallets) are tracked independently — every account balance always computable.',
  },
  {
    icon: WifiOff,
    title: 'Offline-first',
    body: 'Expenses happen everywhere — often without data. Everything logs locally and syncs when you\u2019re back online.',
  },
]

const flowSteps = [
  {
    icon: ArrowDownToLine,
    step: '01',
    title: 'Income lands',
    body: 'Each income source has an expected landing window. Misi learns the rhythm and flags anything that hasn\u2019t arrived.',
  },
  {
    icon: PiggyBank,
    step: '02',
    title: 'Auto-save splits',
    body: 'Every source carries its own savings percentage, proposed as a one-tap transfer to Savings the moment income lands.',
  },
  {
    icon: Sprout,
    step: '03',
    title: 'Allocate & grow',
    body: 'From Savings, deliberate moves into investments and foreign currency. Investing becomes a flow, not a chore.',
  },
]

const reconcileRows = seedReconcile.map((balance) => {
  const account = seedAccounts.find((item) => item.id === balance.accountId)
  const drift = balance.actual - balance.expected
  return {
    account: account?.name ?? balance.accountId,
    expected: formatK(balance.expected),
    actual: formatK(balance.actual),
    drift: drift === 0 ? null : formatK(drift),
  }
})

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-(--line) bg-(--header-bg) backdrop-blur-md">
      <div className="page-wrap flex items-center justify-between gap-4 py-3.5">
        <a href="#top" className="flex items-center gap-2.5 no-underline">
          <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-lagoon-deep to-palm text-(--btn-text) shadow-md">
            <MisiMark className="size-5" />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-sea-ink">
            Misi
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
          <a className="nav-link" href="#flow">
            The flow
          </a>
          <a className="nav-link" href="#features">
            Features
          </a>
          <a className="nav-link" href="#reconcile">
            Reconcile
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" className="h-9 px-4.5">
            <Link to="/app">Open app</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

function HeroVisual() {
  return (
    <div className="relative">
      <div
        className="island-shell rise-in relative overflow-hidden rounded-3xl p-6 sm:p-7"
        style={{ animationDelay: '200ms' }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-30 overflow-hidden"
          aria-hidden
        >
          <svg
            className="wave-layer absolute bottom-0 h-full w-[200%] opacity-30"
            viewBox="0 0 2400 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,64 C200,24 400,104 600,64 C800,24 1000,104 1200,64 C1400,24 1600,104 1800,64 C2000,24 2200,104 2400,64 L2400,120 L0,120 Z"
              fill="var(--lagoon)"
            />
          </svg>
          <svg
            className="wave-layer-slow absolute bottom-0 h-full w-[200%] opacity-20"
            viewBox="0 0 2400 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,80 C240,40 480,110 720,74 C960,40 1200,110 1440,80 C1680,40 1920,110 2160,74 C2280,56 2360,72 2400,80 L2400,120 L0,120 Z"
              fill="var(--lagoon-deep)"
            />
          </svg>
        </div>

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="island-kicker">Total across everything</p>
              <p className="font-display mt-1.5 text-4xl font-bold tracking-tight text-sea-ink tabular-nums sm:text-[2.6rem]">
                {formatK(netWorth)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-palm">
                <Droplets className="size-3.5" />
                +{formatK(CYCLE.cycleGain)} this cycle
              </p>
            </div>
            <Badge variant="secondary" className="px-3 uppercase">
              MWK
            </Badge>
          </div>

          <div className="mt-6 space-y-3">
            {accounts.map((a) => (
              <div key={a.name} className="flex items-center gap-3">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: a.color }}
                />
                <span className="w-26 shrink-0 text-sm font-semibold text-sea-ink">
                  {a.name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--line)">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: a.pct,
                      background: `linear-gradient(90deg, ${a.color}, var(--lagoon))`,
                    }}
                  />
                </div>
                <span className="font-mono w-24 shrink-0 text-right text-[0.8rem] font-medium text-sea-ink-soft tabular-nums">
                  {a.amount}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-dashed border-(--line) pt-4 text-[0.78rem] font-semibold text-sea-ink-soft">
            <Badge
              variant="secondary"
              className="border-transparent normal-case"
            >
              USD @ K{USD_RATE.toLocaleString('en-US')}
            </Badge>
            <Badge
              variant="secondary"
              className="border-transparent normal-case"
            >
              Cycle anchored to payday
            </Badge>
            <Badge
              variant="secondary"
              className="border-transparent normal-case"
            >
              All accounts reconciled
            </Badge>
          </div>
        </div>
      </div>

      <div
        className="island-shell float-soft rise-in absolute -top-9 right-6 z-10 hidden items-center gap-2.5 rounded-2xl px-4 py-3 lg:flex"
        style={{ animationDelay: '450ms' }}
      >
        <span className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-lagoon to-lagoon-deep text-(--btn-text)">
          <Zap className="size-4" />
        </span>
        <div>
          <p className="font-mono text-sm font-semibold text-sea-ink tabular-nums">
            -K3,500
          </p>
          <p className="text-[0.7rem] font-semibold text-sea-ink-soft">
            Transport · logged in seconds
          </p>
        </div>
      </div>

      <div
        className="island-shell float-soft rise-in absolute -bottom-10 left-8 z-10 hidden items-center gap-2.5 rounded-2xl px-4 py-3 lg:flex"
        style={{ animationDelay: '650ms', animationDuration: '7s' }}
      >
        <span className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-palm to-lagoon-deep text-(--btn-text)">
          <PiggyBank className="size-4" />
        </span>
        <div>
          <p className="text-sm font-bold text-sea-ink">Auto-save proposed</p>
          <p className="text-[0.7rem] font-semibold text-sea-ink-soft">
            A set share of income → Savings · one tap
          </p>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({
  num,
  title,
  lede,
}: {
  num: string
  title: string
  lede: string
}) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="island-kicker mb-3 flex items-center gap-2.5">
        <Badge className="text-[0.68rem] font-extrabold">{num}</Badge>
        {title}
      </p>
      <p className="font-display text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
        {lede}
      </p>
    </div>
  )
}

function Home() {
  return (
    <div id="top" className="min-h-screen">
      <Header />

      <main className="page-wrap">
        <section className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
          <div>
            <p className="island-kicker rise-in mb-4">
              Personal finance · Malawi-first
            </p>
            <h1
              className="font-display rise-in text-[2.75rem] leading-[1.04] font-bold tracking-tight text-sea-ink sm:text-6xl"
              style={{ animationDelay: '80ms' }}
            >
              Money flows.
              <br />
              Misi shows{' '}
              <em className="text-water-gradient italic">where it goes.</em>
            </h1>
            <p
              className="rise-in mt-5 max-w-xl text-lg leading-relaxed text-sea-ink-soft"
              style={{ animationDelay: '160ms' }}
            >
              Bank accounts, mobile money, cash, investments and foreign
              currency — one honest picture of your money, kept in sync with
              reality.
            </p>
            <div
              className="rise-in mt-8 flex flex-wrap items-center gap-3.5"
              style={{ animationDelay: '240ms' }}
            >
              <Button
                asChild
                size="lg"
                className="group h-12 px-6 text-[0.95rem]"
              >
                <Link to="/app">
                  Start tracking
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="h-12 px-6 text-[0.95rem]"
              >
                <a href="#flow">See the flow</a>
              </Button>
            </div>
            <div
              className="rise-in mt-9 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold text-sea-ink-soft"
              style={{ animationDelay: '320ms' }}
            >
              <span className="flex items-center gap-2">
                <Zap className="size-4 text-lagoon-deep" /> Under 10s to log
              </span>
              <span className="flex items-center gap-2">
                <WifiOff className="size-4 text-lagoon-deep" /> Works offline
              </span>
              <span className="flex items-center gap-2">
                <Scale className="size-4 text-lagoon-deep" /> Reconciles with
                reality
              </span>
            </div>
          </div>

          <HeroVisual />
        </section>

        <section id="flow" className="scroll-mt-24 py-14 sm:py-18">
          <SectionHeading
            num="01"
            title="The flow"
            lede="From income to intention, automatically."
          />
          <div className="grid gap-5 md:grid-cols-3 md:gap-0">
            {flowSteps.map((s, i) => (
              <div key={s.step} className="relative flex md:flex-col">
                <Card
                  variant="island"
                  className="feature-card rise-in relative z-10 flex-1 gap-0 rounded-2xl border p-6 md:mx-3"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-linear-to-br from-lagoon-deep to-palm text-(--btn-text) shadow-md">
                      <s.icon className="size-5" strokeWidth={2.2} />
                    </span>
                    <span className="font-mono text-xs font-semibold tracking-widest text-lagoon-deep">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold text-sea-ink">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-[0.92rem] leading-relaxed text-sea-ink-soft">
                    {s.body}
                  </p>
                </Card>
                {i < flowSteps.length - 1 && (
                  <div
                    className="flow-dash absolute top-1/2 right-0 z-0 hidden h-0.5 w-6 -translate-y-1/2 md:block"
                    aria-hidden
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="scroll-mt-24 py-14 sm:py-18">
          <SectionHeading
            num="02"
            title="Principles"
            lede="Simple rules, kept honestly."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            {features.map((f, i) => (
              <Card
                variant="island"
                key={f.title}
                className="feature-card rise-in gap-0 rounded-2xl border p-6.5"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-3.5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-lagoon to-lagoon-deep text-(--btn-text) shadow-md">
                    <f.icon className="size-5" strokeWidth={2.2} />
                  </span>
                  <h3 className="text-[1.08rem] font-extrabold text-sea-ink">
                    {f.title}
                  </h3>
                </div>
                <p className="mt-3.5 text-[0.94rem] leading-relaxed text-sea-ink-soft">
                  {f.body}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section id="reconcile" className="scroll-mt-24 py-14 sm:py-18">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <SectionHeading
                num="03"
                title="Reconciliation"
                lede="Does Misi agree with reality?"
              />
              <p className="-mt-3 max-w-lg text-[1.02rem] leading-relaxed text-sea-ink-soft">
                Every few days: does the app agree with the money you actually
                hold? Misi shows what each account{' '}
                <strong className="text-sea-ink">should</strong> hold, you enter
                what it <strong className="text-sea-ink">actually</strong>{' '}
                holds, and any gap becomes a guided fix.
              </p>
              <ul className="mt-6 space-y-3.5">
                {[
                  'Untracked-days heatmap shows exactly where logging stopped',
                  'Suggested likely misses: recurring expenses, frequent payees',
                  'Quick-add inline, pre-tagged with the reconcile session',
                  'Last resort: a clearly-marked balance adjustment, absorbed by Spending',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[0.95rem] font-medium text-sea-ink-soft"
                  >
                    <span className="mt-0.5 grid size-5.5 shrink-0 place-items-center rounded-full bg-linear-to-br from-lagoon to-palm text-(--btn-text)">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="island-shell rise-in rounded-3xl p-6 sm:p-7"
              style={{ animationDelay: '150ms' }}
            >
              <div className="flex items-center justify-between">
                <p className="island-kicker">Reconcile · {CYCLE.label}</p>
                <span className="font-mono text-[0.72rem] font-semibold text-sea-ink-soft">
                  {reconcileRows.length} accounts
                </span>
              </div>
              <div className="mt-5 space-y-2.5">
                {reconcileRows.map((r) => (
                  <div
                    key={r.account}
                    className="flex items-center gap-3 rounded-xl border border-(--line) bg-(--chip-bg) px-4 py-3"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        background: r.drift ? 'var(--coral)' : 'var(--palm)',
                      }}
                    />
                    <span className="w-24 shrink-0 text-sm font-bold text-sea-ink">
                      {r.account}
                    </span>
                    <div className="flex-1 text-right">
                      <p className="font-mono text-[0.8rem] font-medium text-sea-ink-soft tabular-nums">
                        {r.expected} →{' '}
                        <span className="text-sea-ink">{r.actual}</span>
                      </p>
                    </div>
                    {r.drift ? (
                      <Badge
                        variant="destructive"
                        className="font-mono text-[0.72rem] font-semibold tracking-normal tabular-nums"
                      >
                        {r.drift}
                      </Badge>
                    ) : (
                      <Badge
                        variant="success"
                        className="text-[0.72rem] tracking-normal"
                      >
                        <Check className="size-3" strokeWidth={3} />
                        Matched
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-linear-to-r from-lagoon-deep/10 to-palm/10 px-4 py-3.5">
                <p className="text-sm font-bold text-sea-ink">
                  One gap to close
                </p>
                <Button asChild variant="link" className="group">
                  <Link to="/app">
                    Close it
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="open" className="py-14 sm:py-20">
          <div className="island-shell rise-in relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12">
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              aria-hidden
              style={{
                background:
                  'radial-gradient(520px 240px at 50% 120%, var(--hero-a), transparent 70%)',
              }}
            />
            <div className="relative">
              <span className="mx-auto grid size-13 place-items-center rounded-2xl bg-linear-to-br from-lagoon-deep to-palm text-(--btn-text) shadow-lg">
                <MisiMark className="size-7" />
              </span>
              <h2 className="font-display mx-auto mt-5 max-w-xl text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
                Ready when the money moves.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[1.02rem] text-sea-ink-soft">
                Install Misi on your home screen and log your first transaction
                before the water settles.
              </p>
              <Button asChild size="lg" className="group mt-7">
                <Link to="/app">
                  Open Misi
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-wrap flex flex-col items-start justify-between gap-3 py-8 text-sm font-medium text-sea-ink-soft sm:flex-row sm:items-center">
          <span className="flex items-center gap-2">
            <MisiMark className="size-4.5 text-lagoon-deep" />
            <span className="font-display text-base font-bold text-sea-ink">
              Misi
            </span>
          </span>
          <p>Misi — “water”. Money flows; Misi keeps track of where it goes.</p>
        </div>
      </footer>
    </div>
  )
}
