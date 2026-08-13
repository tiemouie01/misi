import { Link } from '@tanstack/react-router'
import {
  ChartNoAxesCombined,
  House,
  LogOut,
  Tags,
  Wifi,
} from 'lucide-react'

import { MisiMark } from '#/components/misi-mark'
import { ThemeToggle } from '#/components/theme-toggle'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { authClient } from '#/lib/auth-client'

const DAY_MS = 86_400_000

const APP_NAV = [
  { to: '/app', label: 'Home', icon: House, exact: true },
  {
    to: '/app/budget',
    label: 'Budget',
    icon: ChartNoAxesCombined,
    exact: false,
  },
  {
    to: '/app/categories',
    label: 'Categories',
    icon: Tags,
    exact: false,
  },
] as const

const navItemClassName =
  'inline-flex size-8 shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-semibold whitespace-nowrap text-sea-ink-soft no-underline outline-none transition-[background-color,color,box-shadow] hover:text-sea-ink focus-visible:ring-2 focus-visible:ring-lagoon/40 sm:size-auto sm:h-full sm:px-3 data-[status=active]:bg-lagoon-deep/15 data-[status=active]:font-bold data-[status=active]:text-lagoon-deep data-[status=active]:shadow-sm data-[status=active]:ring-1 data-[status=active]:ring-lagoon-deep/35 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'

const navItemActiveClassName =
  'bg-lagoon-deep/15 font-bold text-lagoon-deep shadow-sm ring-1 ring-lagoon-deep/35'

type CycleBadgeSource = {
  label: string
  startsAt: number
  endsAt: number
}

function cycleBadgeLabel(cycle: CycleBadgeSource, now = Date.now()) {
  const totalDays = Math.max(
    1,
    Math.ceil((cycle.endsAt + 1 - cycle.startsAt) / DAY_MS),
  )
  const dayNumber = Math.min(
    totalDays,
    Math.max(1, Math.floor((now - cycle.startsAt) / DAY_MS) + 1),
  )
  return `${cycle.label} · day ${dayNumber}`
}

export function AppHeader({
  cycle,
}: {
  cycle?: CycleBadgeSource | null
}) {
  const badge = cycle ? cycleBadgeLabel(cycle) : null

  return (
    <header className="sticky top-0 z-20 border-b border-(--line) bg-(--header-bg) backdrop-blur-md">
      <div className="page-wrap flex items-center justify-between gap-2 py-3.5 sm:gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link to="/app" className="flex items-center gap-2.5 no-underline">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-lagoon-deep to-palm text-(--btn-text) shadow-md">
              <MisiMark className="size-5" />
            </span>
            <span className="font-display hidden text-2xl font-bold tracking-tight text-sea-ink sm:inline">
              Misi
            </span>
          </Link>
          {badge ? (
            <Badge
              variant="secondary"
              className="hidden px-3 uppercase md:inline-flex"
            >
              {badge}
            </Badge>
          ) : null}
        </div>
        <nav
          aria-label="App"
          className="inline-flex h-9 shrink-0 items-center rounded-full border border-(--chip-line) bg-(--chip-bg) p-0.5 sm:h-10 sm:p-1"
        >
          {APP_NAV.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                activeOptions={item.exact ? { exact: true } : undefined}
                className={navItemClassName}
                activeProps={{
                  className: navItemActiveClassName,
                  'aria-current': 'page',
                }}
              >
                <Icon />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="success"
                className="hidden px-3 uppercase md:flex"
              >
                <Wifi className="size-3.5" />
                Synced
              </Badge>
            </TooltipTrigger>
            <TooltipContent>All changes are synced</TooltipContent>
          </Tooltip>
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                aria-label="Sign out"
                className="size-9"
                onClick={async () => {
                  await authClient.signOut()
                  window.location.href = '/login'
                }}
              >
                <LogOut className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}
