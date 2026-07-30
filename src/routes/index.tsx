import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Droplets,
  Layers,
  Moon,
  PiggyBank,
  Scale,
  Sprout,
  Sun,
  Waves,
  WifiOff,
  Zap,
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

const accounts = [
  { name: 'Bank', amount: 'K842,100', pct: '72%', color: 'var(--lagoon-deep)' },
  {
    name: 'Mobile Money',
    amount: 'K96,300',
    pct: '26%',
    color: 'var(--lagoon)',
  },
  { name: 'Cash', amount: 'K38,500', pct: '12%', color: 'var(--palm)' },
  {
    name: 'Investments',
    amount: 'K1,412,000',
    pct: '88%',
    color: 'var(--lagoon-deep)',
  },
  { name: 'USD Account', amount: '$420.00', pct: '34%', color: 'var(--palm)' },
]

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

const reconcileRows = [
  { account: 'Bank 1', expected: 'K842,100', actual: 'K842,100', drift: null },
  { account: 'Bank 2', expected: 'K210,450', actual: 'K210,450', drift: null },
  {
    account: 'Airtel Money',
    expected: 'K96,300',
    actual: 'K91,800',
    drift: '-K4,500',
  },
  { account: 'Cash', expected: 'K38,500', actual: 'K38,500', drift: null },
]

function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleTheme() {
    const nextIsDark = !isDark
    document.documentElement.classList.toggle('dark', nextIsDark)
    localStorage.setItem('misi-theme', nextIsDark ? 'dark' : 'light')
    setIsDark(nextIsDark)
  }

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      className="grid size-9 place-items-center rounded-full border border-(--chip-line) bg-(--chip-bg) text-sea-ink transition hover:border-lagoon-deep"
      onClick={toggleTheme}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-(--line) bg-(--header-bg) backdrop-blur-md">
      <div className="page-wrap flex items-center justify-between gap-4 py-3.5">
        <a href="#top" className="flex items-center gap-2.5 no-underline">
          <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-lagoon-deep to-palm text-white shadow-md">
            <Waves className="size-4.5" strokeWidth={2.4} />
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
          <a
            href="#open"
            className="btn-primary rounded-full px-4.5 py-2 text-sm font-bold no-underline shadow-md transition hover:shadow-lg hover:brightness-110"
          >
            Open app
          </a>
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
                K2,847,500
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-palm">
                <Droplets className="size-3.5" />
                +K112,300 this cycle
              </p>
            </div>
            <span className="rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1 text-[0.7rem] font-bold tracking-wide text-sea-ink-soft uppercase">
              MWK
            </span>
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
            <span className="rounded-full bg-(--chip-bg) px-2.5 py-1">
              USD @ K1,735
            </span>
            <span className="rounded-full bg-(--chip-bg) px-2.5 py-1">
              Cycle anchored to payday
            </span>
            <span className="rounded-full bg-(--chip-bg) px-2.5 py-1">
              All accounts reconciled
            </span>
          </div>
        </div>
      </div>

      <div
        className="island-shell float-soft rise-in absolute -top-9 right-6 z-10 hidden items-center gap-2.5 rounded-2xl px-4 py-3 lg:flex"
        style={{ animationDelay: '450ms' }}
      >
        <span className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-lagoon to-lagoon-deep text-white">
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
        <span className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-palm to-lagoon-deep text-white">
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
        <span className="rounded-full border border-(--chip-line) bg-(--chip-bg) px-2.5 py-1 text-[0.68rem] font-extrabold text-lagoon-deep">
          {num}
        </span>
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
              <a
                href="#open"
                className="btn-primary group flex items-center gap-2 rounded-full px-6 py-3 text-[0.95rem] font-bold no-underline shadow-lg transition hover:shadow-xl hover:brightness-110"
              >
                Start tracking
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#flow"
                className="rounded-full border border-(--chip-line) bg-(--chip-bg) px-6 py-3 text-[0.95rem] font-bold text-sea-ink no-underline transition hover:border-lagoon-deep hover:text-sea-ink"
              >
                See the flow
              </a>
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
                <div
                  className="island-shell feature-card rise-in relative z-10 flex-1 rounded-2xl border p-6 md:mx-3"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-linear-to-br from-lagoon-deep to-palm text-white shadow-md">
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
                </div>
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
              <div
                key={f.title}
                className="island-shell feature-card rise-in rounded-2xl border p-6.5"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-3.5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-lagoon to-lagoon-deep text-white shadow-md">
                    <f.icon className="size-5" strokeWidth={2.2} />
                  </span>
                  <h3 className="text-[1.08rem] font-extrabold text-sea-ink">
                    {f.title}
                  </h3>
                </div>
                <p className="mt-3.5 text-[0.94rem] leading-relaxed text-sea-ink-soft">
                  {f.body}
                </p>
              </div>
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
                    <span className="mt-0.5 grid size-5.5 shrink-0 place-items-center rounded-full bg-linear-to-br from-lagoon to-palm text-white">
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
                <p className="island-kicker">Reconcile · Jul cycle</p>
                <span className="font-mono text-[0.72rem] font-semibold text-sea-ink-soft">
                  4 accounts
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
                        background: r.drift ? '#d96a4e' : 'var(--palm)',
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
                      <span className="font-mono rounded-full bg-[#d96a4e]/12 px-2.5 py-1 text-[0.72rem] font-semibold text-[#c05a40] tabular-nums">
                        {r.drift}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-palm/12 px-2.5 py-1 text-[0.72rem] font-bold text-palm">
                        <Check className="size-3" strokeWidth={3} />
                        Matched
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-linear-to-r from-lagoon-deep/10 to-palm/10 px-4 py-3.5">
                <p className="text-sm font-bold text-sea-ink">
                  One gap to close
                </p>
                <a
                  href="#open"
                  className="flex items-center gap-1.5 text-sm font-bold text-lagoon-deep no-underline transition hover:gap-2.5"
                >
                  Close it <ArrowRight className="size-4" />
                </a>
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
              <span className="mx-auto grid size-13 place-items-center rounded-2xl bg-linear-to-br from-lagoon-deep to-palm text-white shadow-lg">
                <Waves className="size-6" strokeWidth={2.2} />
              </span>
              <h2 className="font-display mx-auto mt-5 max-w-xl text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
                Ready when the money moves.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[1.02rem] text-sea-ink-soft">
                Install Misi on your home screen and log your first transaction
                before the water settles.
              </p>
              <a
                href="#top"
                className="btn-primary group mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-bold no-underline shadow-lg transition hover:shadow-xl hover:brightness-110"
              >
                Open Misi
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-wrap flex flex-col items-start justify-between gap-3 py-8 text-sm font-medium text-sea-ink-soft sm:flex-row sm:items-center">
          <span className="flex items-center gap-2">
            <Waves className="size-4 text-lagoon-deep" />
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
