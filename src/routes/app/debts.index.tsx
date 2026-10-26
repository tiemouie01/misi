import { convexQuery } from '@convex-dev/react-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { AppProviders } from '#/components/app/app-providers'
import { DebtRow } from '#/components/debts/list/debt-row'
import { DebtsSummary } from '#/components/debts/list/debts-summary'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { mapDebt } from '#/lib/debts'
import { formatAmountInput, parseAmount } from '#/lib/onboarding-data'
import { errorMessage } from '#/lib/error-message'

import type { Id } from '../../../convex/_generated/dataModel'
import type { Debt, DebtDirection } from '#/lib/app-data'

const bootstrapQuery = convexQuery(api.misi.bootstrap, {})
const listDebtsQuery = convexQuery(api.misi.listDebts, {})

export const Route = createFileRoute('/app/debts/')({
  loader: async ({ context }) => {
    const [data] = await Promise.all([
      context.queryClient.ensureQueryData(bootstrapQuery),
      context.queryClient.ensureQueryData(listDebtsQuery),
    ])
    if (data === null || !data.settings?.onboardedAt) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: DebtsPage,
})

function DebtsPage() {
  const queryClient = useQueryClient()
  const { data: rows } = useSuspenseQuery(listDebtsQuery)
  const createDebt = useMutation(api.misi.createDebt)
  const restoreDebt = useMutation(api.misi.restoreDebt)
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [direction, setDirection] = useState<DebtDirection>('you_owe')
  const [opening, setOpening] = useState('')

  const debts = rows.map(mapDebt)
  const visible = useMemo(() => {
    const filtered = debts.filter((debt) =>
      showArchived ? debt.archived : !debt.archived,
    )
    const needle = query.trim().toLowerCase()
    if (!needle) return filtered
    return filtered.filter((debt) => debt.name.toLowerCase().includes(needle))
  }, [debts, query, showArchived])

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bootstrapQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: listDebtsQuery.queryKey }),
    ])
  }

  async function save() {
    if (saving) return
    setError(null)
    setSaving(true)
    try {
      await createDebt({
        name,
        direction,
        openingBalance: parseAmount(opening),
      })
      await invalidate()
      setEditorOpen(false)
      setName('')
      setOpening('')
      setDirection('you_owe')
      toast.success('Debt added')
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to add debt'))
    } finally {
      setSaving(false)
    }
  }

  async function restore(debt: Debt) {
    try {
      await restoreDebt({ debtId: debt.id as Id<'debts'> })
      await invalidate()
      toast.success('Debt restored')
    } catch (caught) {
      toast.error(errorMessage(caught, 'Unable to restore debt'))
    }
  }

  return (
    <AppProviders>
      <main className="page-wrap py-6 sm:py-8">
        <header className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-sea-ink-soft">
              Money you owe and money owed to you
            </p>
            <h1 className="font-display mt-1 text-[1.75rem] font-bold tracking-tight text-sea-ink sm:text-4xl">
              Debts
            </h1>
          </div>
          <Button
            type="button"
            onClick={() => {
              setError(null)
              setEditorOpen(true)
            }}
          >
            <Plus className="size-4" />
            Add debt
          </Button>
        </header>

        <div className="mt-5 sm:mt-6">
          <DebtsSummary debts={debts} />
        </div>

        <Card variant="panel" className="mt-4 gap-0 p-4 sm:mt-6 sm:p-5">
          <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-sea-ink">
              {showArchived ? 'Archived debts' : 'Your debts'}
            </h2>
            <ToggleGroup
              type="single"
              value={showArchived ? 'archived' : 'open'}
              onValueChange={(value) => {
                if (value) setShowArchived(value === 'archived')
              }}
              aria-label="Which debts to show"
            >
              <ToggleGroupItem value="open">Open</ToggleGroupItem>
              <ToggleGroupItem value="archived">Archived</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sea-ink-soft" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
              className="h-11 rounded-xl pl-9"
              aria-label="Search debts"
            />
          </div>

          {visible.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-sea-ink-soft">
              {showArchived
                ? 'No archived debts.'
                : query
                  ? 'No debts match that name.'
                  : 'No debts yet. Tap Add debt to write one down.'}
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-(--line)">
              {visible.map((debt) => (
                <DebtRow
                  key={debt.id}
                  debt={debt}
                  onRestore={(target) => void restore(target)}
                />
              ))}
            </ul>
          )}
        </Card>
      </main>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent
          sheet
          className="rounded-3xl border-(--line) bg-(--surface-strong)"
        >
          <DialogHeader>
            <DialogTitle>Add a debt</DialogTitle>
            <DialogDescription>
              One person or loan at a time. Start with what is already owed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="debt-name">Name</Label>
              <Input
                id="debt-name"
                className="mt-2"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Chisomo"
              />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-sea-ink">
                Who owes?
              </legend>
              <div className="flex gap-2">
                {(
                  [
                    ['you_owe', 'You owe'],
                    ['owed_to_you', 'Owed to you'],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-pressed={direction === value}
                    className="h-10 sm:h-8 aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10"
                    onClick={() => setDirection(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </fieldset>
            <div>
              <Label htmlFor="debt-opening">Already owed</Label>
              <Input
                id="debt-opening"
                className="mt-2"
                inputMode="decimal"
                value={opening}
                onChange={(event) =>
                  setOpening(formatAmountInput(event.target.value))
                }
                placeholder="0"
              />
              <p className="mt-1.5 text-xs text-sea-ink-soft">
                Does not move any account. Use this for money already owed.
              </p>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
              >
                {error}
              </p>
            )}
          </div>
          <DialogFooter sticky>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Add debt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppProviders>
  )
}
