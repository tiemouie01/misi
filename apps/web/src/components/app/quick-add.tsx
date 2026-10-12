import {
  CalendarIcon,
  ChevronDown,
  Delete,
  PiggyBank,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'

import { AccountPicker } from '#/components/app/account-picker'
import { CategoryPicker } from '#/components/app/category-picker'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  claimActionsForDebt,
  debtNameIsAmbiguous,
  formatTransactionDate,
  occurredAtFromDate,
  recentDisplayAmount,
} from '#/hooks/quick-add-form'
import { useQuickAddForm } from '#/hooks/use-quick-add-form'
import { formatK, formatUsd } from '#/lib/app-data'
import { resolveCategory } from '#/lib/categories'
import {
  claimActionLabel,
  claimAllowsFromSavings,
  claimForbidsAccount,
  claimRequiresAccount,
} from '@misi/shared/claim'
import { oneTapRecentKey } from '@misi/shared/one-tap-recents'

import type { QuickAddIncomeSource } from '#/hooks/quick-add-form'
import type {
  Account,
  AdjustPolarity,
  ClaimAction,
  Debt,
  QuickAddInitial,
  QuickAddPayload,
  RecentTransaction,
} from '#/lib/app-data'
import type { Category } from '#/lib/categories'

interface QuickAddSheetProps {
  initial: QuickAddInitial
  categories: Category[]
  accounts: Account[]
  debts?: Debt[]
  incomeSources?: QuickAddIncomeSource[]
  recents?: RecentTransaction[]
  /** Category keys ranked by recent use, most used first. */
  categoryUsage?: string[]
  defaultExpenseAccountId: string
  defaultTransferFromAccountId: string
  defaultTransferToAccountId: string
  usdRate: number
  reconcileNote: string
  autoSaveRateForSource: (sourceId?: string) => number
  resolveAccountId: (accountId: string) => string
  error?: string | null
  onClose: () => void
  onSave: (payload: QuickAddPayload) => void
  onDelete?: () => void
}

interface QuickAddFabProps {
  onOpen: (initial: QuickAddInitial) => void
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
  recents,
  categories,
  accounts,
  usdRate,
  onSelect,
}: {
  recents: RecentTransaction[]
  categories: Category[]
  accounts: Account[]
  usdRate: number
  onSelect: (recent: RecentTransaction) => void
}) {
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {recents.map((recent) => {
        const category = resolveCategory(categories, recent.categoryId)
        if (!category) return null
        const Icon = category.icon
        const account = accounts.find(
          (candidate) => candidate.id === recent.accountId,
        )
        const display = recentDisplayAmount(recent, account, usdRate)
        const amount =
          display.currency === 'USD'
            ? formatUsd(display.amount)
            : formatK(display.amount)
        return (
          <Button
            key={oneTapRecentKey(recent)}
            type="button"
            variant="secondary"
            className="h-auto min-h-10 max-w-full px-3.5 py-2 font-semibold sm:min-h-0"
            onClick={() => onSelect(recent)}
          >
            <Icon className="size-4" style={{ color: category.color }} />
            <span className="truncate">{recent.payee}</span>
            <span className="font-mono text-sea-ink-soft tabular-nums">
              {amount}
            </span>
          </Button>
        )
      })}
    </div>
  )
}

export function QuickAddFab({ onOpen }: QuickAddFabProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-5 pb-[max(calc(var(--app-bottom-nav-h,0px)+1.25rem),env(safe-area-inset-bottom))] sm:p-6">
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

function ClaimFields({
  debts,
  mwkAccounts,
  debtId,
  claimAction,
  adjustPolarity,
  accountId,
  fromSavings,
  lockIdentity,
  nextRemaining,
  onDebtId,
  onClaimAction,
  onAdjustPolarity,
  onAccountId,
  onFromSavings,
}: {
  debts: Debt[]
  mwkAccounts: Account[]
  debtId: string
  claimAction: ClaimAction
  adjustPolarity: AdjustPolarity
  accountId: string
  fromSavings: boolean
  lockIdentity: boolean
  nextRemaining: number | null
  onDebtId: (id: string) => void
  onClaimAction: (action: ClaimAction) => void
  onAdjustPolarity: (polarity: AdjustPolarity) => void
  onAccountId: (id: string) => void
  onFromSavings: (value: boolean) => void
}) {
  const selected = debts.find((debt) => debt.id === debtId)
  const actions = claimActionsForDebt(selected)
  const needsAccount = claimRequiresAccount(claimAction)
  const hidesAccount = claimForbidsAccount(claimAction)
  const showFromSavings = claimAllowsFromSavings(claimAction)

  return (
    <>
      <fieldset className="mt-5">
        <legend className="field-label mb-2">Debt</legend>
        {debts.length === 0 ? (
          <p className="text-sm text-sea-ink-soft">
            Add a debt first from the Debts page.
          </p>
        ) : (
          <div className="flex min-w-0 flex-wrap gap-2">
            {debts.map((debt) => (
              <Button
                key={debt.id}
                type="button"
                variant="secondary"
                size="sm"
                disabled={lockIdentity}
                aria-pressed={debtId === debt.id}
                className="h-10 max-w-full sm:h-8 aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink"
                onClick={() => onDebtId(debt.id)}
              >
                <span className="truncate">{debt.name}</span>
                {debtNameIsAmbiguous(debts, debt) && (
                  <span className="shrink-0 text-sea-ink-soft">
                    · {debt.direction === 'you_owe' ? 'You owe' : 'Owed to you'}
                  </span>
                )}
              </Button>
            ))}
          </div>
        )}
        {selected && (
          <p className="mt-1.5 text-xs text-sea-ink-soft">
            Remaining {formatK(selected.remaining)}
            {nextRemaining !== null && nextRemaining !== selected.remaining
              ? ` → ${formatK(nextRemaining)}`
              : ''}
            {nextRemaining !== null && nextRemaining < 0
              ? ' · cannot go below zero'
              : ''}
          </p>
        )}
      </fieldset>
      <fieldset className="mt-4">
        <legend className="field-label mb-2">Action</legend>
        <div className="flex min-w-0 flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action}
              type="button"
              variant="secondary"
              size="sm"
              disabled={lockIdentity}
              aria-pressed={claimAction === action}
              className="h-10 sm:h-8 aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink"
              onClick={() => onClaimAction(action)}
            >
              {claimActionLabel(action)}
            </Button>
          ))}
        </div>
      </fieldset>
      {claimAction === 'adjust' && (
        <fieldset className="mt-4">
          <legend className="field-label mb-2">Adjust</legend>
          <div className="flex gap-2">
            {(['increase', 'decrease'] as const).map((polarity) => (
              <Button
                key={polarity}
                type="button"
                variant="secondary"
                size="sm"
                aria-pressed={adjustPolarity === polarity}
                className="h-10 sm:h-8 aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink"
                onClick={() => onAdjustPolarity(polarity)}
              >
                {polarity === 'increase'
                  ? 'Increase remaining'
                  : 'Decrease remaining'}
              </Button>
            ))}
          </div>
        </fieldset>
      )}
      {!hidesAccount && (
        <fieldset className="mt-5">
          <legend className="field-label mb-2">
            {needsAccount ? 'Account' : 'Account (optional)'}
          </legend>
          <div className="flex min-w-0 flex-wrap gap-2">
            {!needsAccount && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                aria-pressed={!accountId}
                className="h-10 sm:h-8 aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink"
                onClick={() => onAccountId('')}
              >
                No account
              </Button>
            )}
            {mwkAccounts.map((account) => (
              <Button
                key={account.id}
                type="button"
                variant="secondary"
                size="sm"
                aria-pressed={accountId === account.id}
                className="h-10 max-w-full sm:h-8 aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink"
                onClick={() => onAccountId(account.id)}
              >
                <span className="truncate">{account.name}</span>
              </Button>
            ))}
          </div>
        </fieldset>
      )}
      {showFromSavings && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-(--chip-line) bg-(--chip-bg) px-4 py-3">
          <div className="min-w-0">
            <Label
              htmlFor="quick-add-claim-from-savings"
              className="mb-0 text-sm font-bold normal-case tracking-normal text-sea-ink"
            >
              From savings
            </Label>
            {fromSavings && (
              <p className="mt-1 text-xs font-normal text-sea-ink-soft">
                Uses the savings envelope. Does not count toward the spending
                plan.
              </p>
            )}
          </div>
          <Switch
            id="quick-add-claim-from-savings"
            checked={fromSavings}
            onCheckedChange={onFromSavings}
          />
        </div>
      )}
    </>
  )
}

export function QuickAddSheet({
  initial,
  categories,
  accounts,
  debts,
  incomeSources = [],
  recents,
  categoryUsage,
  defaultExpenseAccountId,
  defaultTransferFromAccountId,
  defaultTransferToAccountId,
  usdRate,
  reconcileNote,
  autoSaveRateForSource,
  resolveAccountId,
  error,
  onClose,
  onSave,
  onDelete,
}: QuickAddSheetProps) {
  const {
    isEditing,
    isAutoSave,
    mode,
    switchMode,
    digits,
    amountMwk,
    amountCurrency,
    amountDisplay,
    conversionRate,
    appendDigit,
    deleteDigit,
    transferLegs,
    accountId,
    selectAccount,
    setAccountId,
    toAccountId,
    setToAccountId,
    mwkAccounts,
    categoryId,
    setCategoryId,
    sheetRecents,
    selectRecent,
    items,
    setItems,
    excludeFromBudget,
    toggleExcludeFromBudget,
    sourceId,
    archivedIncomeSourceId,
    selectIncomeSource,
    clearIncomeSource,
    autoSaveRate,
    debtId,
    selectDebt,
    pickerDebts,
    claimAction,
    setClaimAction,
    adjustPolarity,
    setAdjustPolarity,
    nextRemaining,
    payee,
    setPayee,
    note,
    setNote,
    fromSavings,
    setFromSavings,
    occurredAt,
    setOccurredAt,
    detailSummary,
    detailsOpen,
    toggleDetails,
    canSave,
    save,
    saveLabel,
  } = useQuickAddForm({
    initial,
    categories,
    accounts,
    debts,
    incomeSources,
    recents,
    defaultExpenseAccountId,
    defaultTransferFromAccountId,
    defaultTransferToAccountId,
    usdRate,
    autoSaveRateForSource,
    resolveAccountId,
    error,
    onSave,
  })

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
      appendDigit(event.key)
    } else if (event.key === '.' || event.key === ',') {
      event.preventDefault()
      appendDigit('.')
    } else if (event.key === 'Backspace') {
      event.preventDefault()
      deleteDigit()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      save()
    }
  })

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent
        sheet
        className="gap-0 overflow-x-hidden rounded-3xl border border-(--line) bg-(--surface-strong) shadow-2xl backdrop-blur-md sm:max-w-md"
      >
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
        ) : isEditing && initial.mode === 'claim' ? (
          <p className="island-kicker mr-11">
            {claimActionLabel(claimAction, adjustPolarity)}
          </p>
        ) : (
          <div
            className={`mr-11 grid h-13 min-w-0 gap-0.5 rounded-full border border-(--chip-line) bg-(--chip-bg) p-1 sm:mr-11 sm:h-10 sm:gap-1 ${
              isEditing ? 'grid-cols-3' : 'grid-cols-4'
            }`}
          >
            {(isEditing
              ? (['expense', 'income', 'transfer'] as const)
              : (['expense', 'income', 'transfer', 'claim'] as const)
            ).map((type) => (
              <Button
                key={type}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={mode === type}
                className="h-full min-w-0 w-full rounded-full px-1 text-[0.6875rem] text-sea-ink-soft min-[360px]:text-xs sm:px-1.5 shadow-none hover:text-sea-ink aria-pressed:bg-lagoon-deep/15 aria-pressed:font-bold aria-pressed:text-lagoon-deep aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-lagoon-deep/35"
                onClick={() => switchMode(type)}
              >
                <span className="truncate">
                  {type === 'claim'
                    ? 'Debt'
                    : `${type[0].toUpperCase()}${type.slice(1)}`}
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
          {transferLegs ? (
            <p className="mt-2 text-sm text-sea-ink-soft">
              {transferLegs.from}
              {' → '}
              {transferLegs.to}
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
                onClick={() => appendDigit(key)}
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
            onClick={deleteDigit}
          >
            <Delete className="size-5" />
          </Button>
        </div>
        {!isAutoSave && mode === 'expense' && (
          <>
            {!isEditing && sheetRecents.length > 0 && (
              <div className="mt-5 min-w-0">
                <p className="field-label mb-2">One-tap recents</p>
                <RecentChips
                  recents={sheetRecents}
                  categories={categories}
                  accounts={accounts}
                  usdRate={usdRate}
                  onSelect={selectRecent}
                />
              </div>
            )}
            <div className="mt-5 min-w-0">
              <p className="field-label mb-2">Category</p>
              <CategoryPicker
                categories={categories}
                usage={categoryUsage}
                value={categoryId}
                onChange={setCategoryId}
              />
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
          </>
        )}
        {!isAutoSave && mode !== 'transfer' && mode !== 'claim' && (
          <AccountPicker
            label={mode === 'income' ? 'Into account' : 'From account'}
            accounts={accounts}
            selected={accountId}
            onSelect={selectAccount}
          />
        )}
        {!isAutoSave && mode === 'claim' && (
          <ClaimFields
            debts={pickerDebts}
            mwkAccounts={mwkAccounts}
            debtId={debtId}
            claimAction={claimAction}
            adjustPolarity={adjustPolarity}
            accountId={accountId}
            fromSavings={fromSavings}
            lockIdentity={isEditing}
            nextRemaining={nextRemaining}
            onDebtId={selectDebt}
            onClaimAction={setClaimAction}
            onAdjustPolarity={setAdjustPolarity}
            onAccountId={setAccountId}
            onFromSavings={setFromSavings}
          />
        )}
        {!isAutoSave &&
          mode === 'income' &&
          (incomeSources.length > 0 || archivedIncomeSourceId) && (
            <fieldset className="mt-5">
              <legend className="field-label mb-2">Income source</legend>
              <div className="flex min-w-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-pressed={!sourceId}
                  className="h-10 sm:h-8 aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink"
                  onClick={clearIncomeSource}
                >
                  Unassigned
                </Button>
                {archivedIncomeSourceId && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled
                    aria-pressed={sourceId === archivedIncomeSourceId}
                    title="This source is archived and will remain linked unless you choose another source."
                    className="h-10 max-w-full sm:h-8 aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink"
                  >
                    <span className="truncate">Archived source</span>
                  </Button>
                )}
                {incomeSources.map((source) => (
                  <Button
                    key={source.id}
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-pressed={sourceId === source.id}
                    className="h-10 max-w-full sm:h-8 aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink"
                    onClick={() => selectIncomeSource(source)}
                  >
                    <span className="truncate">{source.name}</span>
                  </Button>
                ))}
              </div>
            </fieldset>
          )}
        {!isAutoSave && mode === 'income' && !isEditing && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-palm/10 px-3.5 py-3">
            <PiggyBank className="size-4 shrink-0 text-palm" />
            <p className="text-[0.82rem] font-semibold text-sea-ink">
              Auto-save {Math.round(autoSaveRate * 100)}% — Misi will propose{' '}
              <span className="font-mono tabular-nums">
                {formatK(Math.round(amountMwk * autoSaveRate))}
              </span>{' '}
              → Savings.
            </p>
          </div>
        )}
        {!isAutoSave && (
          <Button
            type="button"
            variant="ghost"
            aria-expanded={detailsOpen}
            aria-controls="quick-add-details"
            className="group mt-4 h-11 w-full min-w-0 justify-between rounded-xl px-3 sm:h-10"
            onClick={toggleDetails}
          >
            <span className="shrink-0">More details</span>
            <span className="flex min-w-0 items-center gap-1.5">
              {!detailsOpen && detailSummary.length > 0 && (
                <span className="truncate text-xs font-semibold">
                  {detailSummary.join(' · ')}
                </span>
              )}
              <ChevronDown className="size-4 transition-transform group-aria-expanded:rotate-180" />
            </span>
          </Button>
        )}
        {detailsOpen && (
          <div id="quick-add-details" className="min-w-0">
            {!isAutoSave && mode === 'transfer' && (
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
            )}
            {!isAutoSave && mode !== 'transfer' && mode !== 'claim' && (
              <div className="mt-5">
                <Label htmlFor="quick-add-payee" className="mb-2">
                  {mode === 'income' ? 'From' : 'Payee'}
                </Label>
                <Input
                  id="quick-add-payee"
                  className="px-4 py-2.5 font-semibold placeholder:font-normal"
                  placeholder={
                    mode === 'income' ? 'e.g. Salary' : 'e.g. Chipiku'
                  }
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
                      Won't count against this cycle's budget. The savings
                      envelope covers it.
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
                onClick={toggleExcludeFromBudget}
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
                    Keep the transaction in your records without counting it
                    toward this cycle's budget.
                  </span>
                </span>
              </Button>
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
          </div>
        )}
        <DialogFooter
          sticky
          className="mt-6 flex-col sm:flex-col sm:justify-start"
        >
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
            >
              {error}
            </p>
          )}
          <Button
            type="button"
            disabled={!canSave}
            size="lg"
            className="h-auto w-full py-3.5 shadow-lg disabled:opacity-45"
            onClick={save}
          >
            {saveLabel}
          </Button>
          {isEditing && onDelete && (
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full py-2.5 text-coral-deep hover:bg-coral/10 hover:text-coral-deep"
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
              Delete transaction
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
