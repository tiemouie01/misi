import { Link } from '@tanstack/react-router'
import { ChevronRight, LayoutGrid, Tags, Wallet } from 'lucide-react'

import { SettingsSection } from '#/components/settings/settings-section'

const rowClassName =
  'flex items-center gap-3 rounded-2xl px-2 py-3 no-underline outline-none hover:bg-(--chip-bg) focus-visible:ring-2 focus-visible:ring-lagoon/40'

function RowContent({
  icon: Icon,
  label,
  hint,
}: {
  icon: typeof Tags
  label: string
  hint: string
}) {
  return (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lagoon-deep/12 text-lagoon-deep">
        <Icon className="size-[1.125rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-sea-ink">{label}</span>
        <span className="block text-xs font-semibold text-sea-ink-soft">
          {hint}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-sea-ink-soft" />
    </>
  )
}

export function ManageSection() {
  return (
    <SettingsSection title="Manage" icon={LayoutGrid}>
      <div className="-mx-2 flex flex-col">
        <Link to="/app/categories" className={rowClassName}>
          <RowContent
            icon={Tags}
            label="Categories"
            hint="Add, edit and archive spending categories"
          />
        </Link>
        <div aria-hidden className="mx-2 border-t border-(--line)" />
        {/* Income sources is a task overlay on the /app layout; open it here
            rather than via /app/income-sources, which redirects to Home. */}
        <Link
          to="/app/settings"
          search={{ task: 'income-sources' }}
          className={rowClassName}
        >
          <RowContent
            icon={Wallet}
            label="Income sources"
            hint="Expected income each cycle and its savings split"
          />
        </Link>
      </div>
    </SettingsSection>
  )
}
