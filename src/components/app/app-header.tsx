import { Link } from '@tanstack/react-router'
import {
  ChartNoAxesCombined,
  House,
  LogOut,
  Menu,
  Scale,
  Tags,
} from 'lucide-react'

import { MisiMark } from '#/components/misi-mark'
import { ThemeToggle } from '#/components/theme-toggle'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
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
    to: '/app/debts',
    label: 'Debts',
    icon: Scale,
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

const bottomNavItemClassName =
  'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.6875rem] font-semibold text-sea-ink-soft no-underline outline-none transition-[background-color,color,box-shadow] hover:text-sea-ink focus-visible:ring-2 focus-visible:ring-lagoon/40 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0'

async function signOut() {
  await authClient.signOut()
  window.location.href = '/login'
}

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

export function AppHeader({ cycle }: { cycle?: CycleBadgeSource | null }) {
  const badge = cycle ? cycleBadgeLabel(cycle) : null

  return (
    <header className="sticky top-0 z-20 border-b pt-[env(safe-area-inset-top)] border-(--line) bg-(--header-bg) backdrop-blur-md">
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
          className="hidden h-9 min-w-0 items-center justify-start overflow-x-auto overscroll-x-contain rounded-full border border-(--chip-line) bg-(--chip-bg) p-0.5 [scrollbar-width:none] sm:inline-flex sm:h-10 sm:shrink-0 sm:p-1 [&::-webkit-scrollbar]:hidden"
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
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Menu"
              className="size-10 sm:hidden"
            >
              <Menu className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-60 rounded-2xl border-(--line) bg-(--surface-strong) p-1.5 backdrop-blur-md"
          >
            <ThemeToggle withLabel />
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full justify-start gap-3 px-3"
              onClick={signOut}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </PopoverContent>
        </Popover>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                aria-label="Sign out"
                className="size-9"
                onClick={signOut}
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

export function AppBottomNav() {
  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-20 grid h-(--app-bottom-nav-h) grid-cols-4 gap-1 border-t border-(--line) bg-(--header-bg) pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))] pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
    >
      {APP_NAV.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={item.exact ? { exact: true } : undefined}
            className={bottomNavItemClassName}
            activeProps={{
              className: navItemActiveClassName,
              'aria-current': 'page',
            }}
          >
            <Icon />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
