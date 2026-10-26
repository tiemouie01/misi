import { Link } from '@tanstack/react-router'
import {
  ChartNoAxesCombined,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  House,
  LogOut,
  Plus,
  Settings,
  Tags,
  UserRound,
  Users,
} from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'

import { useOptionalQuickAdd } from '#/components/app/quick-add-provider'
import { BrandMark } from '#/components/misi-mark'
import { Button, buttonVariants } from '#/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { authClient } from '#/lib/auth-client'
import { errorMessage } from '#/lib/error-message'
import { signOut } from '#/lib/sign-out'
import { cn } from '#/lib/utils'

const DAY_MS = 86_400_000
const SIDEBAR_STORAGE_KEY = 'misi-sidebar'
/** Matches the sidebar's `duration-200` width transition. */
const SIDEBAR_SLIDE_MS = 200

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
      title="Add spending or income (N)"
      className={cn('water-press', className)}
      onClick={() => quickAdd.openSheet({ mode: 'expense' })}
    >
      {children}
    </Button>
  )
}

const sidebarLinkClassName =
  'flex h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-semibold whitespace-nowrap text-sea-ink-soft no-underline outline-none transition-colors hover:bg-(--chip-bg) hover:text-sea-ink focus-visible:ring-2 focus-visible:ring-lagoon/45 data-[status=active]:bg-white/12 data-[status=active]:font-bold data-[status=active]:text-sea-ink data-[status=active]:[&_svg]:text-lagoon dark:data-[status=active]:bg-lagoon-deep/10 [&_svg]:size-5 [&_svg]:shrink-0 sidebar-collapsed:h-14 sidebar-collapsed:flex-col sidebar-collapsed:justify-center sidebar-collapsed:gap-1 sidebar-collapsed:px-0 sidebar-collapsed:text-[0.6875rem]'

function saveSidebarState(collapsed: boolean) {
  try {
    if (collapsed) localStorage.setItem(SIDEBAR_STORAGE_KEY, 'collapsed')
    else localStorage.removeItem(SIDEBAR_STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode); the toggle still works.
  }
}

/** The signed-in user, opening a menu with account settings and sign out. */
function SidebarUserMenu() {
  const { data: session } = authClient.useSession()
  const [signingOut, setSigningOut] = useState(false)
  const user = session?.user
  const name = user?.name || 'Your account'

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
    } catch (caught) {
      setSigningOut(false)
      toast.error(errorMessage(caught, 'Unable to sign out'))
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={`Account: ${name}`}
          className="h-auto w-full justify-start gap-3 rounded-2xl px-2 py-2 text-left font-normal sidebar-collapsed:justify-center sidebar-collapsed:px-0"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/14 text-sea-ink dark:bg-lagoon-deep/12">
            <UserRound className="size-5" />
          </span>
          <span className="min-w-0 flex-1 sidebar-collapsed:hidden">
            <span className="block truncate text-sm font-bold text-sea-ink">
              {name}
            </span>
            {user?.email && (
              <span className="block truncate text-xs text-sea-ink-soft">
                {user.email}
              </span>
            )}
          </span>
          <ChevronsUpDown className="size-4 text-sea-ink-soft sidebar-collapsed:hidden" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-64 rounded-2xl border-(--line) bg-(--surface-strong) p-1.5 text-sea-ink backdrop-blur-md"
      >
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-bold">{name}</p>
          {user?.email && (
            <p className="truncate text-xs text-sea-ink-soft">{user.email}</p>
          )}
        </div>
        <div className="my-1 h-px bg-(--line)" />
        <Link
          to="/app/settings"
          className="flex h-10 items-center gap-2.5 rounded-xl px-2.5 text-sm font-semibold text-sea-ink! no-underline hover:bg-(--chip-bg)"
        >
          <Settings className="size-4 text-sea-ink-soft" />
          Account settings
        </Link>
        <button
          type="button"
          disabled={signingOut}
          className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-sm font-semibold text-sea-ink hover:bg-(--chip-bg) disabled:opacity-60"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="size-4 text-sea-ink-soft" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </PopoverContent>
    </Popover>
  )
}

/** Desktop and tablet navigation. Collapses to a labelled rail; Add stays its
 * first, largest item either way. The width slides: collapsing clips the
 * expanded content until the rail fades in, expanding reveals it. */
export function AppSidebar({ cycle }: { cycle?: ShellCycle | null }) {
  const collapsed = useSyncExternalStore(
    subscribeToSidebarState,
    sidebarCollapsed,
    () => false,
  )

  function toggle() {
    const root = document.documentElement
    if (collapsed) {
      delete root.dataset.sidebar
      saveSidebarState(false)
      return
    }
    if (root.dataset.sidebarMotion) return
    saveSidebarState(true)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.dataset.sidebar = 'collapsed'
      return
    }
    root.dataset.sidebarMotion = 'collapsing'
    window.setTimeout(() => {
      root.dataset.sidebar = 'collapsed'
      delete root.dataset.sidebarMotion
    }, SIDEBAR_SLIDE_MS)
  }

  return (
    <aside
      aria-label="Menu"
      className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-x-hidden overflow-y-auto px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex sidebar-narrow:w-23 sidebar-collapsed:px-2.5"
    >
      {/* Fixed width while expanded so the slide clips content instead of
          reflowing it; the rail layout fades in once the slide ends. */}
      <div className="flex w-56 flex-1 flex-col gap-5 sidebar-collapsed:w-full sidebar-collapsed:animate-in sidebar-collapsed:items-center sidebar-collapsed:duration-200 sidebar-collapsed:fade-in-0">
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

        <AddButton className="h-12 w-full justify-start gap-2.5 rounded-2xl pr-3 pl-4 text-base sidebar-collapsed:size-17 sidebar-collapsed:flex-col sidebar-collapsed:justify-center sidebar-collapsed:gap-0.5 sidebar-collapsed:rounded-[1.25rem] sidebar-collapsed:p-0 sidebar-collapsed:text-xs">
          <Plus className="size-5 sidebar-collapsed:size-6" strokeWidth={2.6} />
          Add
          <kbd
            aria-hidden
            className="ml-auto grid size-6 place-items-center rounded-md bg-(--btn-text)/15 font-sans text-xs font-bold sidebar-collapsed:hidden"
          >
            N
          </kbd>
        </AddButton>

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
            <div className="rounded-2xl border border-(--line) bg-(--chip-bg) px-3.5 py-3 text-[0.8rem] whitespace-nowrap text-sea-ink-soft sidebar-collapsed:hidden">
              <p className="text-sm font-bold text-sea-ink">This pay month</p>
              {cycleSummary(cycle)}
            </div>
          )}
          <SidebarUserMenu />
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
      </div>
    </aside>
  )
}

/** Phone-only top bar; navigation lives in the bottom tab bar. */
export function AppMobileHeader() {
  return (
    <header className="sticky top-0 z-20 bg-(--header-bg) pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
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
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'size-11 text-sea-ink data-[status=active]:bg-white/12',
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
      className="app-surface fixed inset-x-0 bottom-0 z-30 grid h-(--app-bottom-nav-h) grid-cols-5 border-t border-(--line) bg-(--card-solid) shadow-[0_-8px_24px_rgba(6,30,28,0.18)] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] pl-[max(0.5rem,env(safe-area-inset-left))] md:hidden"
    >
      <BottomNavLink item={home} />
      <BottomNavLink item={budget} />
      <div className="flex flex-col items-center justify-end pb-1.5">
        <AddButton className="-mt-7 size-15 rounded-[50%/46%_46%_54%_54%] border-4 border-(--card-solid) p-0 shadow-lg [--btn-a:var(--lagoon)] [--btn-b:var(--lagoon)] [--btn-text:#0d3337] dark:[--btn-text:#06231d]">
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
