import { Link } from '@tanstack/react-router'
import { Settings, Waves, Wifi } from 'lucide-react'

import { ThemeToggle } from '#/components/theme-toggle'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-(--line) bg-(--header-bg) backdrop-blur-md">
      <div className="page-wrap flex items-center justify-between gap-4 py-3.5">
        <div className="flex items-center gap-3">
          <Link to="/app" className="flex items-center gap-2.5 no-underline">
            <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-lagoon-deep to-palm text-(--btn-text) shadow-md">
              <Waves className="size-4.5" strokeWidth={2.4} />
            </span>
            <span className="font-display text-2xl font-bold tracking-tight text-sea-ink">
              Misi
            </span>
          </Link>
          <span className="hidden rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1 text-[0.7rem] font-bold tracking-wide text-sea-ink-soft uppercase sm:inline">
            Jul cycle · day 11
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1 text-[0.7rem] font-bold tracking-wide text-palm uppercase sm:flex">
            <Wifi className="size-3.5" />
            Synced
          </span>
          <ThemeToggle />
          <button
            type="button"
            aria-label="Settings"
            className="grid size-9 place-items-center rounded-full border border-(--chip-line) bg-(--chip-bg) text-sea-ink transition hover:border-lagoon-deep"
            onClick={() => undefined}
          >
            <Settings className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
