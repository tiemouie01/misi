import { Link } from '@tanstack/react-router'
import { LogOut, Tags, Wifi } from 'lucide-react'

import { MisiMark } from '#/components/misi-mark'
import { ThemeToggle } from '#/components/theme-toggle'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'

export function AppHeader({ badge }: { badge: string }) {
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
            {badge}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="hidden px-3 uppercase sm:flex">
            <Wifi className="size-3.5" />
            Synced
          </Badge>
          <ThemeToggle />
          <Button asChild variant="secondary" size="icon-sm" className="size-9">
            <Link to="/app/categories" aria-label="Manage categories">
              <Tags className="size-4" />
            </Link>
          </Button>
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
        </div>
      </div>
    </header>
  )
}
