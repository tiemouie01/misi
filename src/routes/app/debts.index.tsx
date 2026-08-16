import { convexQuery } from '@convex-dev/react-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { ArchiveRestore, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { AppProviders } from '#/components/app/app-providers'
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
import { formatK } from '#/lib/app-data'
import { mapDebt } from '#/lib/debts'
import { formatAmountInput, parseAmount } from '#/lib/onboarding-data'
import { mutationErrorMessage } from '#/lib/use-quick-add-sheet'

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
      setError(mutationErrorMessage(caught, 'Unable to add debt'))
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
      toast.error(mutationErrorMessage(caught, 'Unable to restore debt'))
    }
  }

  return (
    <AppProviders>
      <div className="min-h-screen">
        <main className="page-wrap py-6 sm:py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
                Debts
              </h1>
              <p className="mt-1.5 text-[0.95rem] text-sea-ink-soft">
                Named obligations you owe or that are owed to you.
              </p>
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
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sea-ink-soft" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name"
                className="h-10 rounded-xl pl-9"
                aria-label="Search debts"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              aria-pressed={showArchived}
              onClick={() => setShowArchived((current) => !current)}
            >
              {showArchived ? 'Viewing archived' : 'Show archived'}
            </Button>
          </div>

          <Card variant="island" className="mt-5 gap-0 rounded-3xl p-3 sm:p-4">
            {visible.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-sea-ink-soft">
                {showArchived
                  ? 'No archived debts.'
                  : query
                    ? 'No debts match that name.'
                    : 'No debts yet. Add an obligation to start the ledger.'}
              </p>
            ) : (
              visible.map((debt, index) => (
                <div
                  key={debt.id}
                  className={index > 0 ? 'border-t border-(--line)' : undefined}
                >
                  <div className="flex items-center gap-2">
                    <Link
                      to="/app/debts/$debtId"
                      params={{ debtId: debt.id }}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl px-3 py-3 no-underline hover:bg-(--chip-bg)"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-sea-ink">
                          {debt.name}
                        </span>
                        <span className="text-xs font-semibold text-sea-ink-soft">
                          {debt.direction === 'you_owe'
                            ? 'You owe'
                            : 'Owed to you'}
                        </span>
                      </span>
                      <span className="font-mono shrink-0 text-sm font-semibold text-sea-ink tabular-nums">
                        {formatK(debt.remaining)}
                      </span>
                    </Link>
                    {debt.archived && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Restore ${debt.name}`}
                        onClick={() => void restore(debt)}
                      >
                        <ArchiveRestore className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </Card>
        </main>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add a debt</DialogTitle>
            <DialogDescription>
              One obligation, one name. Opening is what was already outstanding.
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
                Direction
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
                    className="aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10"
                    onClick={() => setDirection(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </fieldset>
            <div>
              <Label htmlFor="debt-opening">Opening balance</Label>
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
          <DialogFooter>
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
