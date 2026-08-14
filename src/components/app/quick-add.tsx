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
import { Switch } from '#/components/ui/switch'
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
import { currencyToMwk, formatK, formatUsd, mwkToCurrency, oneTapRecents } from '#/lib/app-data'
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
  usdRate: number
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

const MAX_AMOUNT_WHOLE_DIGITS = 9
const MAX_AMOUNT_FRACTION_DIGITS = 2

function amountToDigits(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return ''
  return String(Math.round(amount * 100) / 100)
}

function parseAmountDigits(digits: string) {
  if (!digits || digits === '.') return 0
  const amount = Number(digits)
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100) / 100
}

function appendAmountInput(current: string, value: string) {
  if (value === '.' || value === ',') {
    if (current.includes('.')) return current
    return current === '' ? '0.' : `${current}.`
  }

  if (!/^\d+$/.test(value)) return current

  if (current.includes('.')) {
    const [whole, fraction = ''] = current.split('.')
    if (fraction.length >= MAX_AMOUNT_FRACTION_DIGITS) return current
    const nextFraction = `${fraction}${value}`.slice(
      0,
      MAX_AMOUNT_FRACTION_DIGITS,
    )
    return `${whole}.${nextFraction}`
  }

  if (current === '0') {
    return value.replace(/^0+/, '') || '0'
  }

  const next = `${current}${value}`.replace(/^0+(\d)/, '$1')
  return next.slice(0, MAX_AMOUNT_WHOLE_DIGITS)
}

function formatTransferLeg(
  account: Account,
  mwkAmount: number,
  usdRate: number,
  sign: '+' | '−',
) {
  const native =
    account.currency === 'USD'
      ? formatUsd(mwkToCurrency(mwkAmount, 'USD', usdRate))
      : formatK(mwkAmount)
  return `${account.name} ${sign}${native}`
}

function formatAmountDigitsDisplay(
  digits: string,
  currency: Account['currency'],
) {
  const prefix = currency === 'USD' ? '$ ' : 'K '
  if (!digits) return `${prefix}0`

  const hasDecimal = digits.includes('.')
  const [wholePart, fractionPart = ''] = digits.split('.')
  const whole = Number(wholePart || '0')
  const formattedWhole = Number.isFinite(whole)
    ? whole.toLocaleString('en-US')
    : '0'

  if (!hasDecimal) return `${prefix}${formattedWhole}`
  return `${prefix}${formattedWhole}.${fractionPart}`
}

function formatEnteredAmount(value: number, currency: Account['currency']) {
  return currency === 'USD' ? formatUsd(value) : formatK(value)
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
  usdRate,
  reconcileNote,
  autoSaveRateForPayee,
  resolveAccountId,
  error,
  onClose,
  onSave,
  onDelete,
}: QuickAddSheetProps) {
  const isEditing = initial.transactionId !== undefined
  const initialAccountId =
    initial.accountId ??
    (initial.mode === 'transfer'
      ? defaultTransferFromAccountId
      : defaultExpenseAccountId)
  const initialAmountCurrency =
    initial.autoSave === true
      ? 'MWK'
      : (accounts.find((account) => account.id === initialAccountId)
          ?.currency ?? 'MWK')
  const initialUsdRate = initial.fxRate ?? usdRate
  const [mode, setMode] = useState<TxnType>(initial.mode)
  const [digits, setDigits] = useState(() =>
    initial.amount
      ? amountToDigits(
          initialAmountCurrency === 'USD'
            ? mwkToCurrency(initial.amount, 'USD', initialUsdRate)
            : initial.amount,
        )
      : '',
  )
  const [categoryId, setCategoryId] = useState(
    initial.categoryId ?? firstExpenseCategoryKey(categories),
  )
  const [accountId, setAccountId] = useState(initialAccountId)
  const [toAccountId, setToAccountId] = useState(
    initial.toAccountId ?? defaultTransferToAccountId,
  )
  const [payee, setPayee] = useState(initial.payee ?? '')
  const [items, setItems] = useState(initial.items ?? '')
  const [note, setNote] = useState(initial.note ?? '')
  const [excludeFromBudget, setExcludeFromBudget] = useState(
    initial.excludeFromBudget ?? false,
  )
  const [fromSavings, setFromSavings] = useState(initial.fromSavings ?? false)
  const [occurredAt, setOccurredAt] = useState(initial.occurredAt ?? 0)
  const isAutoSave = initial.autoSave === true
  const fromAccount = accounts.find((account) => account.id === accountId)
  const toAccount = accounts.find((account) => account.id === toAccountId)
  const amountCurrency: Account['currency'] = isAutoSave
    ? 'MWK'
    : (fromAccount?.currency ?? 'MWK')
  const conversionRate = initial.fxRate ?? usdRate
  const amount = parseAmountDigits(digits)
  let amountMwk = amount
  if (amount > 0 && amountCurrency === 'USD' && conversionRate > 0) {
    try {
      amountMwk = currencyToMwk(amount, 'USD', conversionRate)
    } catch {
      amountMwk = 0
    }
  }
  const autoSaveRate = autoSaveRateForPayee(payee)
  const canSave =
    amount > 0 &&
    amountMwk > 0 &&
    (amountCurrency !== 'USD' || conversionRate > 0) &&
    (isAutoSave ||
      (Boolean(accountId) &&
        (mode !== 'transfer' || accountId !== toAccountId)))

  function retargetAmount(previousAccountId: string, nextAccountId: string) {
    const previous = accounts.find((account) => account.id === previousAccountId)
    const next = accounts.find((account) => account.id === nextAccountId)
    if (!previous || !next || previous.currency === next.currency) return
    setDigits((current) => {
      const parsed = parseAmountDigits(current)
      if (parsed <= 0 || conversionRate <= 0) return current
      try {
        const mwk = currencyToMwk(parsed, previous.currency, conversionRate)
        return amountToDigits(
          mwkToCurrency(mwk, next.currency, conversionRate),
        )
      } catch {
        return current
      }
    })
  }

  function selectAccount(nextAccountId: string) {
    retargetAmount(accountId, nextAccountId)
    setAccountId(nextAccountId)
  }

  function appendDigits(value: string) {
    setDigits((current) => appendAmountInput(current, value))
  }

  function save() {
    if (!canSave) return
    if (isAutoSave) {
      onSave({
        transactionId: initial.transactionId,
        type: 'allocation',
        amount: amountMwk,
        payee: initial.payee ?? 'Auto-save',
        note: note.trim() || undefined,
        occurredAt,
      })
      return
    }
    onSave({
      transactionId: initial.transactionId,
      type: mode,
      amount: amountMwk,
      categoryId: mode !== 'expense' ? undefined : categoryId,
      accountId,
      toAccountId: mode !== 'transfer' ? undefined : toAccountId,
      payee:
        mode === 'transfer'
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
      fromSavings:
        (mode === 'expense' || mode === 'transfer') && fromSavings
          ? true
          : undefined,
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
    } else if (event.key === '.' || event.key === ',') {
      event.preventDefault()
      appendDigits('.')
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

  const amountDisplay = formatAmountDigitsDisplay(digits, amountCurrency)
  const saveLabel = isEditing
    ? 'Save changes'
    : mode === 'expense'
      ? `Log expense${amount ? ` — ${formatEnteredAmount(amount, amountCurrency)}` : ''}`
      : mode === 'income'
        ? `Log income${amount ? ` — ${formatEnteredAmount(amount, amountCurrency)}` : ''}`
        : `Move${amount ? ` ${formatEnteredAmount(amount, amountCurrency)}` : ''}`

  function selectRecent(recent: RecentTransaction) {
    setDigits(amountToDigits(recent.amount))
    setCategoryId(recent.categoryId)
    setAccountId(resolveAccountId(recent.accountId))
    setPayee(recent.payee)
  }

  function switchMode(nextMode: TxnType) {
    const nextAccountId =
      nextMode === 'transfer'
        ? defaultTransferFromAccountId
        : mode === 'transfer'
          ? defaultExpenseAccountId
          : accountId
    retargetAmount(accountId, nextAccountId)
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
            ? 'Change the auto-save amount or date. Account balances stay put.'
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
          <p className="island-kicker">Amount ({amountCurrency})</p>
          <p
            aria-live="polite"
            aria-atomic="true"
            className={`font-mono mt-1 max-w-full truncate text-[2.6rem] font-bold tracking-tight tabular-nums ${digits ? 'text-sea-ink' : 'text-sea-ink-soft/50'}`}
          >
            {amountDisplay}
          </p>
          {mode === 'transfer' &&
          fromAccount &&
          toAccount &&
          fromAccount.currency !== toAccount.currency &&
          conversionRate > 0 &&
          amountMwk > 0 ? (
            <p className="mt-2 text-sm text-sea-ink-soft">
              {formatTransferLeg(fromAccount, amountMwk, conversionRate, '−')}
              {' → '}
              {formatTransferLeg(toAccount, amountMwk, conversionRate, '+')}
              <span className="mt-0.5 block text-xs">
                at K{conversionRate.toLocaleString('en-US')}/$
              </span>
            </p>
          ) : null}
          {initial.reconcile && (
            <Badge variant="destructive" className="mt-1">
              {reconcileNote}
            </Badge>
          )}
        </div>
        <div className="mt-4 grid min-w-0 grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map(
            (key) => (
              <Button
                key={key}
                type="button"
                variant="secondary"
                aria-label={key === '.' ? 'Decimal point' : undefined}
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
        {!isAutoSave && mode === 'expense' && (
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
        {!isAutoSave && mode === 'transfer' && (
          <>
            <AccountPicker
              label="From account"
              accounts={accounts}
              selected={accountId}
              onSelect={selectAccount}
              includeAll
            />
            <AccountPicker
              label="To account"
              accounts={accounts}
              selected={toAccountId}
              onSelect={setToAccountId}
              includeAll
            />
            <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-(--chip-line) bg-(--chip-bg) px-4 py-3">
              <div className="min-w-0">
                <Label
                  htmlFor="quick-add-from-savings"
                  className="mb-0 text-sm font-bold normal-case tracking-normal text-sea-ink"
                >
                  From savings
                </Label>
                {fromSavings && (
                  <p className="mt-1 text-xs font-normal text-sea-ink-soft">
                    Sweeps earmarked savings into the destination account.
                  </p>
                )}
              </div>
              <Switch
                id="quick-add-from-savings"
                checked={fromSavings}
                onCheckedChange={setFromSavings}
              />
            </div>
          </>
        )}
        {!isAutoSave && mode !== 'transfer' && (
          <AccountPicker
            label={mode === 'income' ? 'Into account' : 'From account'}
            accounts={accounts}
            selected={accountId}
            onSelect={selectAccount}
          />
        )}
        {!isAutoSave && mode !== 'transfer' && (
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
        {!isAutoSave && mode === 'expense' && (
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
        {!isAutoSave && mode === 'expense' && (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-(--chip-line) bg-(--chip-bg) px-4 py-3">
            <div className="min-w-0">
              <Label
                htmlFor="quick-add-pay-from-savings"
                className="mb-0 text-sm font-bold normal-case tracking-normal text-sea-ink"
              >
                Pay from savings
              </Label>
              {fromSavings && (
                <p className="mt-1 text-xs font-normal text-sea-ink-soft">
                  Won't count against this cycle's budget. The savings envelope
                  covers it.
                </p>
              )}
            </div>
            <Switch
              id="quick-add-pay-from-savings"
              checked={fromSavings}
              onCheckedChange={setFromSavings}
            />
          </div>
        )}
        {!isAutoSave && mode === 'expense' && !fromSavings && (
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
        {!isAutoSave && mode === 'income' && !isEditing && (
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
