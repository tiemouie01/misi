import { Check, PiggyBank } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { formatK } from '#/lib/app-data'
import { cn } from '#/lib/utils'

export interface TodoAutoSave {
  transactionId: string
  amount: number
  sourceName: string
  savingsRate: number
}

interface TodoCardProps {
  autoSave: TodoAutoSave | null
  autoSaveBusy: boolean
  onConfirmAutoSave: (amount: number) => void
  onDismissAutoSave: () => void
  className?: string
}

function TodoItem({
  icon: Icon,
  title,
  description,
  highlight,
  children,
}: {
  icon: typeof PiggyBank
  title: string
  description: string
  highlight?: boolean
  children: React.ReactNode
}) {
  return (
    <li
      className={cn(
        'rounded-2xl p-4',
        highlight ? 'bg-lagoon-deep/10' : 'border border-(--line)',
      )}
    >
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-(--surface-strong) text-lagoon-deep shadow-sm">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sea-ink">{title}</h3>
          <p className="mt-0.5 text-sm text-sea-ink-soft">{description}</p>
        </div>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-2 *:min-w-0 [&>:first-child:not(form)]:col-span-2 [&>:last-child:nth-child(2)]:col-span-2">
        {children}
      </div>
    </li>
  )
}

function AutoSaveItem({
  autoSave,
  busy,
  onConfirm,
  onDismiss,
}: {
  autoSave: TodoAutoSave
  busy: boolean
  onConfirm: (amount: number) => void
  onDismiss: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(autoSave.amount))
  const draftAmount = Math.round(Number(draft))
  const draftValid = Number.isFinite(draftAmount) && draftAmount > 0
  const percent = Math.round(autoSave.savingsRate * 100)

  return (
    <TodoItem
      icon={PiggyBank}
      highlight
      title={`Your ${autoSave.sourceName} arrived. Save ${formatK(autoSave.amount)}?`}
      description={`That's the ${percent}% you planned to keep in Savings. Your account balances don't change.`}
    >
      {editing ? (
        <form
          className="col-span-2 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (draftValid && !busy) onConfirm(draftAmount)
          }}
        >
          <div className="min-w-32 flex-1">
            <Label htmlFor="auto-save-amount" className="text-sea-ink-soft">
              Amount to save (MWK)
            </Label>
            <Input
              id="auto-save-amount"
              inputMode="numeric"
              autoFocus
              className="mt-1.5 tabular-nums"
              value={draft}
              onChange={(event) =>
                setDraft(event.target.value.replace(/[^\d]/g, ''))
              }
            />
          </div>
          <Button type="submit" disabled={!draftValid || busy}>
            <Check strokeWidth={3} />
            Save {draftValid ? formatK(draftAmount) : ''}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <>
          <Button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(autoSave.amount)}
          >
            {busy ? 'Saving…' : 'Yes, save it'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setDraft(String(autoSave.amount))
              setEditing(true)
            }}
          >
            Change amount
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onDismiss}
          >
            Not now
          </Button>
        </>
      )}
    </TodoItem>
  )
}

/** A savings move Misi needs the user to answer once income lands. Hidden
 * when there is none. */
export function TodoCard({
  autoSave,
  autoSaveBusy,
  onConfirmAutoSave,
  onDismissAutoSave,
  className,
}: TodoCardProps) {
  if (!autoSave) return null

  return (
    <Card variant="panel" className={cn('gap-4 p-4 sm:p-5', className)}>
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-lg font-bold text-sea-ink">To do</h2>
        <Badge className="min-w-6 justify-center rounded-full px-1.5">1</Badge>
      </div>
      <ul className="space-y-3">
        <AutoSaveItem
          key={autoSave.transactionId}
          autoSave={autoSave}
          busy={autoSaveBusy}
          onConfirm={onConfirmAutoSave}
          onDismiss={onDismissAutoSave}
        />
      </ul>
    </Card>
  )
}
