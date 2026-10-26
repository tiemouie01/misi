import { Link } from '@tanstack/react-router'
import {
  ChartNoAxesCombined,
  ChevronsLeft,
  ChevronsRight,
  House,
  Plus,
  Settings,
  Tags,
  Users,
} from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { useOptionalQuickAdd } from '#/components/app/quick-add-provider'
import { MisiMark } from '#/components/misi-mark'
import { Button, buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'

const DAY_MS = 86_400_000
const SIDEBAR_STORAGE_KEY = 'misi-sidebar'

const APP_NAV = [
  { to: '/app', label: 'Home', icon: House, exact: true },
  { to: '/app/budget', label: 'Budget', icon: ChartNoAxesCombined },
  { to: '/app/debts', label: 'Debts', icon: Users },
  { to: '/app/categories', label: 'Categories', icon: Tags },
] as const

const SIDEBAR_NAV = [
  ...APP_NAV,
  { to: '/app/settings', label: 'Settings', icon: Settings },
] as const

const cycleDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
})

type ShellCycle = {
  startsAt: number
  endsAt: number
}

function cycleSummary(cycle: ShellCycle, now = Date.now()) {
  const totalDays = Math.max(
    1,
    Math.ceil((cycle.endsAt + 1 - cycle.startsAt) / DAY_MS),
  )
  const dayNumber = Math.min(
    totalDays,
    Math.max(1, Math.floor((now - cycle.startsAt) / DAY_MS) + 1),
  )
  const range = `${cycleDateFormat.format(cycle.startsAt)} – ${cycleDateFormat.format(cycle.endsAt)}`
  return `${range} · day ${dayNumber} of ${totalDays}`
}

// The root document script applies the saved state to <html> before first
// paint; the sidebar reads it from there so the two never disagree.
function subscribeToSidebarState(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-sidebar'],
  })
  return () => observer.disconnect()
}

function sidebarCollapsed() {
  return document.documentElement.dataset.sidebar === 'collapsed'
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-lagoon-deep to-palm text-(--btn-text) shadow-sm',
        className,
      )}
    >
      <MisiMark className="size-5" />
    </span>
  )
}

/** Opens quick add. Renders nothing until quick add is available (it needs
 * onboarding data), so the shell can render on every /app page. */
function AddButton({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const quickAdd = useOptionalQuickAdd()
  if (!quickAdd) return null
  return (
    <Button
      type="button"
      aria-label="Add spending or income"
      aria-keyshortcuts="N"
      className={className}
      onClick={() => quickAdd.openSheet({ mode: 'expense' })}
    >
      {children}
    </Button>
  )
}

const sidebarLinkClassName =
  'flex h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-semibold text-sea-ink-soft no-underline outline-none transition-colors hover:bg-(--chip-bg) hover:text-sea-ink focus-visible:ring-2 focus-visible:ring-lagoon/45 data-[status=active]:bg-lagoon-deep/12 data-[status=active]:font-bold data-[status=active]:text-sea-ink [&_svg]:size-5 [&_svg]:shrink-0 sidebar-collapsed:h-14 sidebar-collapsed:flex-col sidebar-collapsed:justify-center sidebar-collapsed:gap-1 sidebar-collapsed:px-0 sidebar-collapsed:text-[0.6875rem]'

/** Desktop and tablet navigation. Collapses to a labelled rail; Add stays its
 * first, largest item either way. */
export function AppSidebar({ cycle }: { cycle?: ShellCycle | null }) {
  const collapsed = useSyncExternalStore(
    subscribeToSidebarState,
    sidebarCollapsed,
    () => false,
  )

  function toggle() {
    const next = !collapsed
    if (next) document.documentElement.dataset.sidebar = 'collapsed'
    else delete document.documentElement.dataset.sidebar
    try {
      if (next) localStorage.setItem(SIDEBAR_STORAGE_KEY, 'collapsed')
      else localStorage.removeItem(SIDEBAR_STORAGE_KEY)
    } catch {
      // Storage can be unavailable (private mode); the toggle still works.
    }
  }

  return (
    <aside
      aria-label="Menu"
      className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-(--line) bg-(--header-bg) px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 backdrop-blur-md md:flex sidebar-collapsed:w-23 sidebar-collapsed:items-center sidebar-collapsed:px-2.5"
    >
      <Link
        to="/app"
        aria-label="Misi home"
        className="flex items-center gap-2.5 px-1 no-underline"
      >
        <BrandMark />
        <span className="font-display text-2xl font-bold tracking-tight text-sea-ink sidebar-collapsed:hidden">
          Misi
        </span>
      </Link>

      <div className="flex flex-col gap-1.5">
        <AddButton className="h-13 w-full rounded-2xl text-[0.95rem] sidebar-collapsed:size-17 sidebar-collapsed:flex-col sidebar-collapsed:gap-0.5 sidebar-collapsed:rounded-[1.25rem] sidebar-collapsed:text-xs">
          <Plus className="size-5 sidebar-collapsed:size-6" strokeWidth={2.6} />
          <span className="sidebar-collapsed:hidden">
            Add spending or income
          </span>
          <span className="hidden sidebar-collapsed:inline">Add</span>
        </AddButton>
        <p className="text-center text-xs text-sea-ink-soft sidebar-collapsed:hidden">
          or press{' '}
          <kbd className="rounded-md border border-(--line) bg-(--chip-bg) px-1.5 py-0.5 font-sans font-bold text-sea-ink">
            N
          </kbd>
        </p>
      </div>

      <nav aria-label="App" className="flex w-full flex-col gap-1">
        {SIDEBAR_NAV.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={'exact' in item ? { exact: true } : undefined}
              activeProps={{ 'aria-current': 'page' }}
              className={sidebarLinkClassName}
            >
              <Icon />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto flex w-full flex-col gap-2">
        {cycle && (
          <div className="rounded-2xl bg-(--chip-bg) px-3.5 py-3 text-[0.8rem] text-sea-ink-soft sidebar-collapsed:hidden">
            <p className="text-sm font-bold text-sea-ink">This pay month</p>
            {cycleSummary(cycle)}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Open menu' : 'Collapse menu'}
          className="h-11 justify-start rounded-xl px-3 font-semibold sidebar-collapsed:justify-center sidebar-collapsed:px-0"
          onClick={toggle}
        >
          {collapsed ? (
            <ChevronsRight className="size-5" />
          ) : (
            <ChevronsLeft className="size-5" />
          )}
          <span className="sidebar-collapsed:hidden">Collapse menu</span>
        </Button>
      </div>
    </aside>
  )
}

/** Phone-only top bar; navigation lives in the bottom tab bar. */
export function AppMobileHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-(--line) bg-(--header-bg) pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
      <div className="page-wrap flex h-15 items-center justify-between gap-3">
        <Link to="/app" className="flex items-center gap-2.5 no-underline">
          <BrandMark className="size-8.5" />
          <span className="font-display text-xl font-bold tracking-tight text-sea-ink">
            Misi
          </span>
        </Link>
        <Link
          to="/app/settings"
          aria-label="Settings"
          activeProps={{ 'aria-current': 'page' }}
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'icon' }),
            'size-11 data-[status=active]:border-lagoon-deep/35 data-[status=active]:bg-lagoon-deep/12',
          )}
        >
          <Settings className="size-5" />
        </Link>
      </div>
    </header>
  )
}

const bottomNavLinkClassName =
  'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.6875rem] font-semibold text-sea-ink-soft no-underline outline-none transition-colors hover:text-sea-ink focus-visible:ring-2 focus-visible:ring-lagoon/40 data-[status=active]:font-extrabold data-[status=active]:text-lagoon-deep [&_svg]:size-5.5 [&_svg]:shrink-0'

function BottomNavLink({ item }: { item: (typeof APP_NAV)[number] }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      activeOptions={'exact' in item ? { exact: true } : undefined}
      activeProps={{ 'aria-current': 'page' }}
      className={bottomNavLinkClassName}
    >
      <Icon />
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  )
}

/** Phone tab bar with Add raised in the middle, reachable from every page. */
export function AppBottomNav() {
  const [home, budget, debts, categories] = APP_NAV
  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-30 grid h-(--app-bottom-nav-h) grid-cols-5 border-t border-(--line) bg-(--header-bg) pr-[max(0.5rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] pl-[max(0.5rem,env(safe-area-inset-left))] backdrop-blur-md md:hidden"
    >
      <BottomNavLink item={home} />
      <BottomNavLink item={budget} />
      <div className="flex flex-col items-center justify-end pb-1.5">
        <AddButton className="-mt-7 size-15 rounded-full border-4 border-(--bg-base) p-0 shadow-lg">
          <Plus className="size-6.5" strokeWidth={2.6} />
        </AddButton>
        <span
          aria-hidden
          className="mt-0.5 text-[0.6875rem] font-extrabold text-lagoon-deep"
        >
          Add
        </span>
      </div>
      <BottomNavLink item={debts} />
      <BottomNavLink item={categories} />
    </nav>
  )
}
