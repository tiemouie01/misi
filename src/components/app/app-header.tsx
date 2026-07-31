import { Link } from '@tanstack/react-router'
import { Settings, Wifi } from 'lucide-react'

import { MisiMark } from '#/components/misi-mark'
import { ThemeToggle } from '#/components/theme-toggle'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { CYCLE } from '#/lib/app-data'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-(--line) bg-(--header-bg) backdrop-blur-md">
      <div className="page-wrap flex items-center justify-between gap-4 py-3.5">
        <div className="flex items-center gap-3">
          <Link to="/app" className="flex items-center gap-2.5 no-underline">
            <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-lagoon-deep to-palm text-(--btn-text) shadow-md">
              <MisiMark className="size-5" />
            </span>
            <span className="font-display text-2xl font-bold tracking-tight text-sea-ink">
              Misi
            </span>
          </Link>
          <Badge
            variant="secondary"
            className="hidden px-3 uppercase sm:inline-flex"
          >
            {CYCLE.headerBadge}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="hidden px-3 uppercase sm:flex">
            <Wifi className="size-3.5" />
            Synced
          </Badge>
          <ThemeToggle />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Settings (coming soon)"
            className="size-9"
            disabled
          >
            <Settings className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
