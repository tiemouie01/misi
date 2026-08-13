import { CalendarIcon, Delete, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'

import { AccountPicker } from '#/components/app/account-picker'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import { Card } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { formatK, oneTapRecents } from '#/lib/app-data'
import { firstExpenseCategoryKey, resolveCategory } from '#/lib/categories'

import type {
  Account,
  QuickAddInitial,
  QuickAddPayload,
  RecentTransaction,
  TxnType,
} from '#/lib/app-data'
import type { Category } from '#/lib/categories'

interface QuickAddCardProps {
  categories: Category[]
  onOpen: (initial: QuickAddInitial) => void
  animationDelay: string
}

interface QuickAddSheetProps {
  initial: QuickAddInitial
  categories: Category[]
  accounts: Account[]
  defaultExpenseAccountId: string
  defaultTransferFromAccountId: string
  defaultTransferToAccountId: string
  reconcileNote: string
  autoSaveRateForPayee: (payee: string) => number
  resolveAccountId: (accountId: string) => string
  error?: string | null
  onClose: () => void
  onSave: (payload: QuickAddPayload) => void
  onDelete?: () => void
}

interface QuickAddFabProps {
  onOpen: (initial: QuickAddInitial) => void
}

function occurredAtFromDate(date: Date) {
  const next = new Date(date)
  next.setHours(12, 0, 0, 0)
  return next.getTime()
}

function formatTransactionDate(occurredAt: number) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(occurredAt))
}

function TransactionDatePicker({
  occurredAt,
  onChange,
}: {
  occurredAt: number
  onChange: (occurredAt: number) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = new Date(occurredAt)

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-[9.25rem] max-w-full shrink justify-start rounded-xl px-3 font-semibold shadow-sm"
          aria-label="Transaction date"
        >
          <CalendarIcon className="size-4 shrink-0 text-lagoon-deep" />
          <span className="truncate">{formatTransactionDate(occurredAt)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return
            onChange(occurredAtFromDate(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function RecentChips({
  categories,
  onSelect,
}: {
  categories: Category[]
  onSelect: (recent: RecentTransaction) => void
}) {
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {oneTapRecents.map((recent) => {
        const category = resolveCategory(categories, recent.categoryId)
        if (!category || category.archived || category.isSystem) return null
        const Icon = category.icon
        return (
          <Button
            key={recent.payee}
            type="button"
            variant="secondary"
            className="h-auto max-w-full px-3.5 py-2 font-semibold"
            onClick={() => onSelect(recent)}
          >
            <Icon className="size-4" style={{ color: category.color }} />
            <span className="truncate">{recent.payee}</span>
            <span className="font-mono text-sea-ink-soft tabular-nums">
              {formatK(recent.amount)}
            </span>
          </Button>
        )
      })}
    </div>
  )
}

export function QuickAddCard({
  categories,
  onOpen,
  animationDelay,
}: QuickAddCardProps) {
  return (
    <Card
      variant="island"
      className="rise-in gap-0 rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <p className="island-kicker">Log · under 10 seconds</p>
      <div className="mt-4 flex items-center gap-4">
        <Button
          type="button"
          aria-label="Log a transaction"
          size="icon-lg"
          className="size-14 shadow-lg hover:shadow-xl"
          onClick={() => onOpen({ mode: 'expense' })}
        >
          <Plus className="size-6" />
        </Button>
        <div>
          <p className="text-lg font-extrabold text-sea-ink">
            Log a transaction
          </p>
          <p className="text-sm text-sea-ink-soft">
            Amount first — details only if you want them.
          </p>
        </div>
      </div>
      <div className="mt-5 border-t border-dashed border-(--line) pt-4">
        <p className="field-label">One-tap recents</p>
        <div className="mt-2.5">
          <RecentChips
            categories={categories}
            onSelect={(recent) =>
              onOpen({
                mode: 'expense',
                amount: recent.amount,
                categoryId: recent.categoryId,
                accountId: recent.accountId,
                payee: recent.payee,
              })
            }
          />
        </div>
      </div>
    </Card>
  )
}

export function QuickAddFab({ onOpen }: QuickAddFabProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            aria-label="Log a transaction"
            size="icon-lg"
            className="pointer-events-auto size-14 shadow-lg hover:shadow-xl"
            onClick={() => onOpen({ mode: 'expense' })}
          >
            <Plus className="size-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Log a transaction</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function QuickAddSheet({
  initial,
  categories,
  accounts,
  defaultExpenseAccountId,
  defaultTransferFromAccountId,
  defaultTransferToAccountId,
  reconcileNote,
  autoSaveRateForPayee,
  resolveAccountId,
  error,
  onClose,
  onSave,
  onDelete,
}: QuickAddSheetProps) {
  const isEditing = initial.transactionId !== undefined
  const [mode, setMode] = useState<TxnType>(initial.mode)
  const [digits, setDigits] = useState(
    initial.amount ? String(initial.amount) : '',
  )
  const [categoryId, setCategoryId] = useState(
    initial.categoryId ?? firstExpenseCategoryKey(categories),
  )
  const [accountId, setAccountId] = useState(
    initial.accountId ??
      (initial.mode === 'transfer'
        ? defaultTransferFromAccountId
        : defaultExpenseAccountId),
  )
  const [toAccountId, setToAccountId] = useState(
    initial.toAccountId ?? defaultTransferToAccountId,
  )
  const [payee, setPayee] = useState(initial.payee ?? '')
  const [items, setItems] = useState(initial.items ?? '')
  const [note, setNote] = useState(initial.note ?? '')
  const [excludeFromBudget, setExcludeFromBudget] = useState(
    initial.excludeFromBudget ?? false,
  )
  const [occurredAt, setOccurredAt] = useState(initial.occurredAt ?? 0)
  const isAutoSave = initial.autoSave === true
  const amount = Number(digits || '0')
  const autoSaveRate = autoSaveRateForPayee(payee)
  const canSave =
    amount > 0 &&
    (isAutoSave || mode !== 'transfer' || accountId !== toAccountId)

  function appendDigits(value: string) {
    setDigits((current) => {
      const next = `${current}${value}`.replace(/^0+/, '')
      return next.slice(0, 9)
    })
  }

  function save() {
    if (!canSave) return
    onSave({
      transactionId: initial.transactionId,
      type: isAutoSave ? 'transfer' : mode,
      amount,
      categoryId: isAutoSave || mode !== 'expense' ? undefined : categoryId,
      accountId,
      toAccountId: isAutoSave || mode !== 'transfer' ? undefined : toAccountId,
      payee: isAutoSave
        ? (initial.payee ?? 'Auto-save')
        : mode === 'transfer'
          ? 'Transfer'
          : payee.trim() ||
            (mode === 'income'
              ? 'Income'
              : (resolveCategory(categories, categoryId)?.name ?? 'Expense')),
      sourceId: mode === 'income' ? initial.sourceId : undefined,
      items: mode === 'expense' && items.trim() ? items.trim() : undefined,
      note: note.trim() || undefined,
      occurredAt,
      excludeFromBudget: mode === 'expense' && excludeFromBudget,
      reconcile: initial.reconcile,
    })
  }

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target
    if (
      target instanceof Element &&
      target.closest('[data-slot="popover-content"], [data-slot="calendar"]')
    ) {
      return
    }
    const inField =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    if (inField) {
      if (event.key === 'Enter') {
        event.preventDefault()
        save()
      }
      return
    }
    if (/^\d$/.test(event.key)) {
      event.preventDefault()
      appendDigits(event.key)
    } else if (event.key === 'Backspace') {
      event.preventDefault()
      setDigits((current) => current.slice(0, -1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      save()
    }
  })

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const amountDisplay = amount ? `K ${amount.toLocaleString('en-US')}` : 'K 0'
  const saveLabel = isEditing
    ? 'Save changes'
    : mode === 'expense'
      ? `Log expense${amount ? ` — ${formatK(amount)}` : ''}`
      : mode === 'income'
        ? `Log income${amount ? ` — ${formatK(amount)}` : ''}`
        : `Move${amount ? ` ${formatK(amount)}` : ''}`

  function selectRecent(recent: RecentTransaction) {
    setDigits(String(recent.amount))
    setCategoryId(recent.categoryId)
    setAccountId(resolveAccountId(recent.accountId))
    setPayee(recent.payee)
  }

  function switchMode(nextMode: TxnType) {
    setMode(nextMode)
    if (nextMode === 'transfer') {
      setAccountId(defaultTransferFromAccountId)
      setToAccountId(defaultTransferToAccountId)
    } else if (mode === 'transfer') {
      setAccountId(defaultExpenseAccountId)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="top-auto right-0 bottom-0 left-0 max-h-[92dvh] w-full min-w-0 max-w-none translate-x-0 translate-y-0 gap-0 overflow-x-hidden overflow-y-auto rounded-t-3xl rounded-b-none border border-(--line) bg-(--surface-strong) p-5 pb-8 shadow-2xl backdrop-blur-md data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:top-1/2 sm:right-auto sm:bottom-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6 sm:pb-6 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0">
        <DialogTitle className="sr-only">
          {isAutoSave
            ? 'Edit auto-save'
            : isEditing
              ? 'Edit transaction'
              : 'Log a transaction'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isAutoSave
            ? 'Change the auto-save amount or the account it is deducted from.'
            : isEditing
              ? 'Update the transaction details.'
              : 'Enter an amount and optional transaction details.'}
        </DialogDescription>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--line) sm:hidden" />
        {isAutoSave ? (
          <p className="island-kicker mr-11">Auto-save → Savings</p>
        ) : (
          <div className="mr-11 grid h-10 min-w-0 grid-cols-3 gap-1 rounded-full border border-(--chip-line) bg-(--chip-bg) p-1">
            {(['expense', 'income', 'transfer'] as const).map((type) => (
              <Button
                key={type}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={mode === type}
                className="h-full min-w-0 w-full rounded-full px-1.5 text-sea-ink-soft shadow-none hover:text-sea-ink aria-pressed:bg-lagoon-deep/15 aria-pressed:font-bold aria-pressed:text-lagoon-deep aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-lagoon-deep/35"
                onClick={() => switchMode(type)}
              >
                <span className="truncate">
                  {type[0].toUpperCase()}
                  {type.slice(1)}
                </span>
              </Button>
            ))}
          </div>
        )}
        <div className="mt-5 min-w-0 text-center">
          <p className="island-kicker">Amount (MWK)</p>
          <p
            aria-live="polite"
            aria-atomic="true"
            className={`font-mono mt-1 max-w-full truncate text-[2.6rem] font-bold tracking-tight tabular-nums ${amount ? 'text-sea-ink' : 'text-sea-ink-soft/50'}`}
          >
            {amountDisplay}
          </p>
          {initial.reconcile && (
            <Badge variant="destructive" className="mt-1">
              {reconcileNote}
            </Badge>
          )}
        </div>
        <div className="mt-4 grid min-w-0 grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map(
            (key) => (
              <Button
                key={key}
                type="button"
                variant="secondary"
                className="font-mono h-auto min-w-0 rounded-2xl px-0 py-3.5 text-lg font-semibold active:scale-95"
                onClick={() => appendDigits(key)}
              >
                {key}
              </Button>
            ),
          )}
          <Button
            type="button"
            aria-label="Delete digit"
            variant="secondary"
            className="font-mono h-auto min-w-0 rounded-2xl px-0 py-3.5 text-lg font-semibold active:scale-95"
            onClick={() => setDigits((current) => current.slice(0, -1))}
          >
            <Delete className="size-5" />
          </Button>
        </div>
        {mode === 'expense' && (
          <>
            {!isEditing && (
              <div className="mt-5 min-w-0">
                <p className="field-label mb-2">One-tap recents</p>
                <RecentChips categories={categories} onSelect={selectRecent} />
              </div>
            )}
            <div className="mt-5 min-w-0">
              <p className="field-label mb-2">Category</p>
              <div className="flex min-w-0 flex-wrap gap-2">
                {categories
                  .filter(
                    (category) => !category.archived && !category.isSystem,
                  )
                  .map((category) => {
                    const Icon = category.icon
                    return (
                      <Button
                        key={category.key}
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-pressed={categoryId === category.key}
                        className="max-w-full aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink"
                        onClick={() => setCategoryId(category.key)}
                      >
                        <Icon
                          className="size-4"
                          style={{ color: category.color }}
                        />
                        <span className="truncate">{category.name}</span>
                      </Button>
                    )
                  })}
              </div>
            </div>
          </>
        )}
        {isAutoSave ? (
          <AccountPicker
            label="Deduct from"
            accounts={accounts}
            selected={accountId}
            onSelect={setAccountId}
          />
        ) : mode === 'transfer' ? (
          <>
            <AccountPicker
              label="From account"
              accounts={accounts}
              selected={accountId}
              onSelect={setAccountId}
            />
            <AccountPicker
              label="To account"
              accounts={accounts}
              selected={toAccountId}
              onSelect={setToAccountId}
            />
          </>
        ) : (
          <AccountPicker
            label={mode === 'income' ? 'Into account' : 'From account'}
            accounts={accounts}
            selected={accountId}
            onSelect={setAccountId}
          />
        )}
        {mode !== 'transfer' && (
          <div className="mt-5">
            <Label htmlFor="quick-add-payee" className="mb-2">
              Payee
            </Label>
            <Input
              id="quick-add-payee"
              className="px-4 py-2.5 font-semibold placeholder:font-normal"
              placeholder="e.g. Chipiku"
              value={payee}
              onChange={(event) => setPayee(event.target.value)}
            />
          </div>
        )}
        {mode === 'expense' && (
          <div className="mt-4">
            <Label htmlFor="quick-add-items" className="sr-only">
              Items
            </Label>
            <Input
              id="quick-add-items"
              className="px-4 py-2.5 font-semibold placeholder:font-normal"
              placeholder="Items — milk, bread… (optional)"
              value={items}
              onChange={(event) => setItems(event.target.value)}
            />
            <p className="mt-1.5 text-[0.72rem] text-sea-ink-soft italic">
              Items answer 'how much on milk?' later.
            </p>
          </div>
        )}
        {mode === 'expense' && (
          <Button
            type="button"
            variant="secondary"
            aria-pressed={excludeFromBudget}
            className="mt-4 h-auto w-full min-w-0 justify-start whitespace-normal rounded-xl px-4 py-3 text-left aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10"
            onClick={() => setExcludeFromBudget((current) => !current)}
          >
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center rounded-md border border-(--line) bg-(--surface-strong) text-xs font-black text-lagoon-deep"
            >
              {excludeFromBudget ? '✓' : ''}
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-sea-ink">
                Exclude from spending plan
              </span>
              <span className="block text-xs font-normal text-sea-ink-soft">
                Keep the transaction in your records without counting it toward
                this cycle's budget.
              </span>
            </span>
          </Button>
        )}
        {mode === 'income' && !isEditing && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-palm/10 px-3.5 py-3">
            <PiggyBank className="size-4 shrink-0 text-palm" />
            <p className="text-[0.82rem] font-semibold text-sea-ink">
              Auto-save {Math.round(autoSaveRate * 100)}% — Misi will propose{' '}
              <span className="font-mono tabular-nums">
                {formatK(Math.round(amount * autoSaveRate))}
              </span>{' '}
              → Savings.
            </p>
          </div>
        )}
        <div className="mt-5 flex min-w-0 gap-2.5">
          <TransactionDatePicker
            occurredAt={occurredAt}
            onChange={setOccurredAt}
          />
          <Label htmlFor="quick-add-note" className="sr-only">
            Note
          </Label>
          <Input
            id="quick-add-note"
            className="min-w-0 flex-1 px-4 py-2.5 font-semibold placeholder:font-normal"
            placeholder="Note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
          >
            {error}
          </p>
        )}
        <Button
          type="button"
          disabled={!canSave}
          size="lg"
          className="mt-6 h-auto w-full py-3.5 shadow-lg disabled:opacity-45"
          onClick={save}
        >
          {saveLabel}
        </Button>
        {isEditing && onDelete && (
          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-auto w-full py-3 text-coral-deep hover:bg-coral/10 hover:text-coral-deep"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
            Delete transaction
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
