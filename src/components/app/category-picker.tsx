import { Check, LayoutGrid } from 'lucide-react'
import { useState } from 'react'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'
import {
  CATEGORY_BUDGET_GROUPS,
  CATEGORY_BUDGET_GROUP_LABELS,
} from '../../../shared/category-defs'

import type { Category } from '#/lib/categories'

/** Pills shown before "More"; about two lines on a 360px phone. */
const PILL_LIMIT = 6

interface CategoryPickerProps {
  categories: Category[]
  /** Category keys ranked by recent use, most used first. */
  usage?: string[]
  value: string
  onChange: (key: string) => void
}

export function CategoryPicker({
  categories,
  usage = [],
  value,
  onChange,
}: CategoryPickerProps) {
  const active = categories.filter(
    (category) => !category.archived && !category.isSystem,
  )
  // Collapse only when "More" would hide at least two categories.
  const collapsed = active.length > PILL_LIMIT + 1
  const [row, setRow] = useState(() =>
    initialRow(active, usage, value).slice(0, PILL_LIMIT),
  )
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  // Keep the selection visible when it changes from outside the row (the
  // "More" dialog or a one-tap recent) without reshuffling the other pills.
  if (
    collapsed &&
    !row.includes(value) &&
    active.some((category) => category.key === value)
  ) {
    setRow([value, ...row.slice(0, PILL_LIMIT - 1)])
  }

  const pills = collapsed
    ? row.flatMap((key) => active.filter((category) => category.key === key))
    : active
  const needle = query.trim().toLowerCase()
  const matches = active.filter((category) =>
    category.name.toLowerCase().includes(needle),
  )

  function pick(key: string) {
    onChange(key)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {pills.map((category) => (
        <CategoryPill
          key={category.key}
          category={category}
          selected={value === category.key}
          onClick={() => onChange(category.key)}
        />
      ))}
      {collapsed && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 sm:h-8"
          onClick={() => setOpen(true)}
        >
          <LayoutGrid className="size-4 text-sea-ink-soft" />
          More
          <span className="font-semibold text-sea-ink-soft">
            +{active.length - pills.length}
          </span>
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery('')
        }}
      >
        <DialogContent
          sheet
          className="gap-4 rounded-3xl border-(--line) bg-(--surface-strong) shadow-2xl sm:max-w-md"
        >
          <div className="pr-12">
            <DialogTitle className="font-display text-xl font-bold text-sea-ink">
              All categories
            </DialogTitle>
            <DialogDescription className="sr-only">
              Search or pick a category for this expense.
            </DialogDescription>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (matches.length > 0) pick(matches[0].key)
            }}
          >
            <Input
              type="search"
              aria-label="Search categories"
              placeholder="Search categories"
              enterKeyHint="go"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </form>
          {matches.length === 0 && (
            <p className="py-6 text-center text-sm text-sea-ink-soft">
              No categories match “{query.trim()}”.
            </p>
          )}
          {CATEGORY_BUDGET_GROUPS.map((group) => {
            const inGroup = matches.filter(
              (category) => category.budgetGroup === group,
            )
            if (inGroup.length === 0) return null
            return (
              <section key={group} className="min-w-0">
                <h3 className="field-label mb-2">
                  {CATEGORY_BUDGET_GROUP_LABELS[group]}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {inGroup.map((category) => (
                    <CategoryPill
                      key={category.key}
                      category={category}
                      selected={value === category.key}
                      grid
                      onClick={() => pick(category.key)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CategoryPill({
  category,
  selected,
  grid = false,
  onClick,
}: {
  category: Category
  selected: boolean
  /** Full-width cell in the dialog grid; long names wrap instead of truncating. */
  grid?: boolean
  onClick: () => void
}) {
  const Icon = category.icon
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      aria-pressed={selected}
      className={cn(
        'h-10 max-w-full sm:h-8 aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink',
        grid &&
          'h-auto min-h-10 justify-start rounded-2xl py-2 text-left whitespace-normal sm:h-auto sm:min-h-9',
      )}
      onClick={onClick}
    >
      <Icon className="size-4" style={{ color: category.color }} />
      <span
        className={cn('truncate', grid && 'min-w-0 flex-1 whitespace-normal')}
      >
        {category.name}
      </span>
      {grid && selected && <Check className="size-4 text-lagoon-deep" />}
    </Button>
  )
}

/** Selected first, then most used, then the user's own category order. */
function initialRow(active: Category[], usage: string[], value: string) {
  const keys = active.map((category) => category.key)
  const used = usage.filter((key) => keys.includes(key))
  return [...new Set([value, ...used, ...keys])].filter((key) =>
    keys.includes(key),
  )
}
