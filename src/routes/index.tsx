import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Layers,
  PiggyBank,
  Scale,
  Sprout,
  Zap,
} from 'lucide-react'

import { AppPreview } from '#/components/marketing/app-preview'
import { BrandMark, MisiMark } from '#/components/misi-mark'
import { ThemeToggle } from '#/components/theme-toggle'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { CYCLE, formatK, seedAccounts, seedReconcile } from '#/lib/app-data'
import { WaterWaves } from '#/components/water'

export const Route = createFileRoute('/')({ component: Home })

const flowSteps = [
  {
    icon: ArrowDownToLine,
    step: '1',
    title: 'Money comes in',
    body: 'Tell Misi when you get paid. It reminds you if money you expect has not come yet.',
  },
  {
    icon: PiggyBank,
    step: '2',
    title: 'Save a part first',
    body: 'When money comes in, Misi offers to put a part of it in savings. One tap.',
  },
  {
    icon: Sprout,
    step: '3',
    title: 'Grow your savings',
    body: 'When you are ready, move savings into investments or dollars.',
  },
]

const features = [
  {
    icon: Zap,
    title: 'Quick to add',
    body: 'Add spending in under 10 seconds. Type the amount, pick what it was for, done. Things you buy often are one tap away.',
  },
  {
    icon: Scale,
    title: 'Matches your real money',
    body: 'Misi works out what each account should hold. You check the real amount. If they are different, Misi helps you fix it.',
  },
  {
    icon: Layers,
    title: 'Where it is, and what it is for',
    body: 'See how much is in each bank, mobile money and cash. Separately, see how much is for spending and how much is savings.',
  },
]

const reconcileSteps = [
  'See the days you did not add anything',
  'Get reminded of things you often pay for',
  'Add what you forgot, right there',
  'If nothing else works, fix the amount and move on',
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

const gaps = reconcileRows.filter((row) => row.drift).length

function Header() {
  return (
    <header className="page-wrap flex items-center justify-between gap-4 py-4">
      <a href="#top" className="flex items-center gap-2.5 no-underline">
        <BrandMark />
        <span className="font-display text-2xl font-bold tracking-tight text-sea-ink">
          Misi
        </span>
      </a>
      <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
        <a className="nav-link" href="#flow">
          How it works
        </a>
        <a className="nav-link" href="#features">
          Why Misi
        </a>
        <a className="nav-link" href="#reconcile">
          Check your money
        </a>
      </nav>
      <div className="flex items-center gap-2">
        <ThemeToggle compact />
        <Button asChild className="h-10 px-5">
          <Link to="/app">Open app</Link>
        </Button>
      </div>
    </header>
  )
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-6 max-w-2xl sm:mb-8">
      <p className="text-sm font-semibold text-sea-ink-soft">{kicker}</p>
      <h2 className="font-display mt-1 text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
        {title}
      </h2>
    </div>
  )
}

function Home() {
  return (
    <div id="top" className="app-ground">
      <WaterWaves />
      <Header />

      <main className="page-wrap">
        <section className="pt-10 pb-12 sm:pt-16 sm:pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="rise-in text-sm font-semibold text-sea-ink-soft">
              Money app for Malawi
            </p>
            <h1
              className="font-display rise-in mt-3 text-[2.75rem] leading-[1.04] font-bold tracking-tight text-sea-ink sm:text-6xl"
              style={{ animationDelay: '80ms' }}
            >
              Money flows.
              <br />
              Misi shows{' '}
              <em className="text-lagoon-deep italic">where it goes.</em>
            </h1>
            <p
              className="rise-in mx-auto mt-5 max-w-xl text-lg leading-relaxed text-sea-ink-soft"
              style={{ animationDelay: '160ms' }}
            >
              Banks, mobile money, cash and savings in one place. See how much
              you can spend until payday.
            </p>
            <div
              className="rise-in mt-8 flex flex-wrap items-center justify-center gap-3.5"
              style={{ animationDelay: '240ms' }}
            >
              <Button asChild size="lg" className="group h-12 px-6">
                <Link to="/app">
                  Start tracking
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="h-12 px-6 text-sea-ink!"
              >
                <a href="#flow">See how it works</a>
              </Button>
            </div>
            <div
              className="rise-in mt-7 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-semibold text-sea-ink-soft"
              style={{ animationDelay: '320ms' }}
            >
              <span className="flex items-center gap-2">
                <Zap className="size-4 text-lagoon" /> Add spending in seconds
              </span>
              <span className="flex items-center gap-2">
                <Scale className="size-4 text-lagoon" /> Matches your real money
              </span>
            </div>
          </div>

          <div
            className="rise-in mt-12 sm:mt-16"
            style={{ animationDelay: '400ms' }}
          >
            <AppPreview />
          </div>
        </section>

        <section id="flow" className="scroll-mt-6 py-12 sm:py-16">
          <SectionHeading
            kicker="How it works"
            title="From payday to savings, step by step."
          />
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {flowSteps.map((s, i) => (
              <Card
                key={s.step}
                variant="panel"
                className="rise-in gap-0 p-5 sm:p-6"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-lagoon-deep/10 text-lagoon-deep">
                    <s.icon className="size-5" strokeWidth={2.2} />
                  </span>
                  <span className="grid size-8 place-items-center rounded-full bg-(--chip-bg) text-sm font-bold text-sea-ink-soft">
                    {s.step}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-sea-ink">
                  {s.title}
                </h3>
                <p className="mt-1.5 leading-relaxed text-sea-ink-soft">
                  {s.body}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section id="features" className="scroll-mt-6 py-12 sm:py-16">
          <SectionHeading kicker="Why Misi" title="Simple, and honest." />
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {features.map((f, i) => (
              <Card
                key={f.title}
                variant="panel"
                className="rise-in gap-0 p-5 sm:p-6"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-lagoon-deep/10 text-lagoon-deep">
                  <f.icon className="size-5" strokeWidth={2.2} />
                </span>
                <h3 className="mt-4 text-lg font-bold text-sea-ink">
                  {f.title}
                </h3>
                <p className="mt-1.5 leading-relaxed text-sea-ink-soft">
                  {f.body}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section id="reconcile" className="scroll-mt-6 py-12 sm:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div>
              <SectionHeading
                kicker="Check your money"
                title="Does Misi match your real money?"
              />
              <p className="-mt-2 max-w-lg text-[1.05rem] leading-relaxed text-sea-ink-soft">
                Every few days, Misi shows what each account{' '}
                <strong className="text-sea-ink">should</strong> hold. You type
                what it <strong className="text-sea-ink">really</strong> holds.
                If they are different, Misi helps you find out why.
              </p>
              <ul className="mt-6 space-y-3.5">
                {reconcileSteps.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 font-medium text-sea-ink-soft"
                  >
                    <span className="mt-0.5 grid size-5.5 shrink-0 place-items-center rounded-full bg-lagoon/22 text-sea-ink dark:bg-lagoon-deep/12">
                      <Check className="size-3 text-lagoon" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Card
              variant="panel"
              className="rise-in gap-0 p-4 sm:p-5"
              style={{ animationDelay: '150ms' }}
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-bold text-sea-ink">
                  Check your money
                </h3>
                <span className="text-sm text-sea-ink-soft">{CYCLE.label}</span>
              </div>
              <ul className="mt-3 space-y-2.5">
                {reconcileRows.map((r) => (
                  <li
                    key={r.account}
                    className="flex items-center gap-3 rounded-2xl bg-(--chip-bg) px-4 py-3"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        background: r.drift ? 'var(--coral)' : 'var(--palm)',
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate font-semibold text-sea-ink">
                      {r.account}
                    </span>
                    <span className="hidden text-sm text-sea-ink-soft tabular-nums sm:inline">
                      {r.expected} →{' '}
                      <span className="text-sea-ink">{r.actual}</span>
                    </span>
                    {r.drift ? (
                      <Badge
                        variant="destructive"
                        className="text-[0.75rem] tracking-normal tabular-nums"
                      >
                        {r.drift}
                      </Badge>
                    ) : (
                      <Badge
                        variant="success"
                        className="text-[0.75rem] tracking-normal"
                      >
                        <Check strokeWidth={3} />
                        Matches
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-coral/10 px-4 py-3">
                <p className="font-semibold text-coral-deep">
                  {gaps === 1
                    ? "One account doesn't match"
                    : `${gaps} accounts don't match`}
                </p>
                <Button asChild variant="ghost" className="group">
                  <Link to="/app">
                    Fix it
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>

        <section id="open" className="py-16 text-center sm:py-24">
          <BrandMark className="mx-auto size-13 rounded-2xl [&_svg]:size-7" />
          <h2 className="font-display mx-auto mt-5 max-w-xl text-3xl font-bold tracking-tight text-sea-ink sm:text-5xl">
            Ready when the money moves.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-lg text-sea-ink-soft">
            Put Misi on your phone's home screen and add your first spending
            today.
          </p>
          <Button asChild size="lg" className="group mt-7 h-12 px-6">
            <Link to="/app">
              Open Misi
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-(--line)">
        <div className="page-wrap flex flex-col items-start justify-between gap-3 py-8 text-sm font-medium text-sea-ink-soft sm:flex-row sm:items-center">
          <span className="flex items-center gap-2">
            <MisiMark className="size-4.5" />
            <span className="font-display text-base font-bold text-sea-ink">
              Misi
            </span>
          </span>
          <p>Misi means “water”. Money flows; Misi shows where it goes.</p>
        </div>
      </footer>
    </div>
  )
}
