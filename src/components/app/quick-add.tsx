import { Calendar, Delete, PiggyBank, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { categories, formatK, oneTapRecents } from '#/lib/app-data'

import type {
  Account,
  QuickAddInitial,
  QuickAddPayload,
  RecentTransaction,
  TxnType,
} from '#/lib/app-data'

interface QuickAddCardProps {
  onOpen: (initial: QuickAddInitial) => void
  animationDelay: string
}

interface QuickAddSheetProps {
  open: boolean
  initial: QuickAddInitial
  accounts: Account[]
  onClose: () => void
  onSave: (payload: QuickAddPayload) => void
}

interface QuickAddFabProps {
  onOpen: (initial: QuickAddInitial) => void
}

const selectableAccounts = ['nbm', 'fdh', 'airtel', 'cash']

function RecentChips({
  onSelect,
}: {
  onSelect: (recent: RecentTransaction) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {oneTapRecents.map((recent) => {
        const category = categories.find(
          (item) => item.id === recent.categoryId,
        )
        if (!category) return null
        const Icon = category.icon
        return (
          <button
            key={recent.payee}
            type="button"
            className="flex items-center gap-2 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3.5 py-2 text-sm font-semibold text-sea-ink transition hover:border-lagoon-deep"
            onClick={() => onSelect(recent)}
          >
            <Icon className="size-4" style={{ color: category.color }} />
            {recent.payee}
            <span className="font-mono text-sea-ink-soft tabular-nums">
              {formatK(recent.amount)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function QuickAddCard({ onOpen, animationDelay }: QuickAddCardProps) {
  return (
    <section
      className="island-shell rise-in rounded-3xl p-6"
      style={{ animationDelay }}
    >
      <p className="island-kicker">Log · under 10 seconds</p>
      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          aria-label="Log a transaction"
          className="btn-primary grid size-14 shrink-0 place-items-center rounded-full shadow-lg transition hover:shadow-xl hover:brightness-110"
          onClick={() => onOpen({ mode: 'expense' })}
        >
          <Plus className="size-6" />
        </button>
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
        <p className="text-[0.72rem] font-bold tracking-widest text-sea-ink-soft uppercase">
          One-tap recents
        </p>
        <div className="mt-2.5">
          <RecentChips
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
    </section>
  )
}

export function QuickAddFab({ onOpen }: QuickAddFabProps) {
  return (
    <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center lg:hidden">
      <button
        type="button"
        className="btn-primary flex items-center gap-2 rounded-full px-6 py-3.5 font-bold shadow-xl"
        onClick={() => onOpen({ mode: 'expense' })}
      >
        <Plus className="size-5" />
        Log transaction
      </button>
    </div>
  )
}

export function QuickAddSheet({
  open,
  initial,
  accounts,
  onClose,
  onSave,
}: QuickAddSheetProps) {
  const [mode, setMode] = useState<TxnType>(initial.mode)
  const [digits, setDigits] = useState(
    initial.amount ? String(initial.amount) : '',
  )
  const [categoryId, setCategoryId] = useState(
    initial.categoryId ?? 'groceries',
  )
  const [accountId, setAccountId] = useState(
    initial.accountId ?? (initial.mode === 'transfer' ? 'nbm' : 'airtel'),
  )
  const [toAccountId, setToAccountId] = useState(initial.toAccountId ?? 'cash')
  const [payee, setPayee] = useState(initial.payee ?? '')
  const [items, setItems] = useState('')
  const [note, setNote] = useState('')
  const amount = Number(digits || '0')
  const canSave =
    amount > 0 && (mode !== 'transfer' || accountId !== toAccountId)

  function appendDigits(value: string) {
    setDigits((current) => {
      const next = `${current}${value}`.replace(/^0+/, '')
      return next.slice(0, 9)
    })
  }

  function save() {
    if (!canSave) return
    onSave({
      type: mode,
      amount,
      categoryId: mode === 'expense' ? categoryId : undefined,
      accountId,
      toAccountId: mode === 'transfer' ? toAccountId : undefined,
      payee:
        mode === 'transfer'
          ? 'Transfer'
          : payee.trim() ||
            (mode === 'income'
              ? 'Income'
              : (categories.find((item) => item.id === categoryId)?.name ??
                'Expense')),
      items: mode === 'expense' && items.trim() ? items.trim() : undefined,
      note: note.trim() || undefined,
      reconcile: initial.reconcile,
    })
  }

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      if (event.key === 'Escape') {
        onClose()
        return
      }
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
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  if (!open) return null

  const amountDisplay = amount ? `K ${amount.toLocaleString('en-US')}` : 'K 0'
  const accountOptions = accounts.filter((account) =>
    selectableAccounts.includes(account.id),
  )
  const saveLabel =
    mode === 'expense'
      ? `Log expense${amount ? ` — ${formatK(amount)}` : ''}`
      : mode === 'income'
        ? `Log income${amount ? ` — ${formatK(amount)}` : ''}`
        : `Move${amount ? ` ${formatK(amount)}` : ''}`

  function selectRecent(recent: RecentTransaction) {
    setDigits(String(recent.amount))
    setCategoryId(recent.categoryId)
    setAccountId(recent.accountId)
    setPayee(recent.payee)
  }

  function switchMode(nextMode: TxnType) {
    setMode(nextMode)
    if (nextMode === 'transfer') {
      setAccountId('nbm')
      setToAccountId('cash')
    } else if (mode === 'transfer') {
      setAccountId('airtel')
    }
  }

  function AccountPicker({
    label,
    selected,
    onSelect,
  }: {
    label: string
    selected: string
    onSelect: (id: string) => void
  }) {
    return (
      <div className="mt-5">
        <p className="mb-2 text-[0.72rem] font-bold tracking-widest text-sea-ink-soft uppercase">
          {label}
        </p>
        <div className="flex flex-wrap gap-2">
          {accountOptions.map((account) => (
            <button
              key={account.id}
              type="button"
              className={
                selected === account.id
                  ? 'rounded-full border border-lagoon-deep bg-lagoon-deep/10 px-3 py-1.5 text-sm font-semibold text-sea-ink transition'
                  : 'rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5 text-sm font-semibold text-sea-ink-soft transition hover:border-lagoon-deep'
              }
              onClick={() => onSelect(account.id)}
            >
              {account.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close transaction sheet"
        className="absolute inset-0 bg-sea-ink/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <section className="rise-in absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-(--line) bg-(--surface-strong) p-5 pb-8 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6 sm:pb-6">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--line) sm:hidden" />
        <button
          type="button"
          aria-label="Close"
          className="absolute top-4 right-4 grid size-9 place-items-center rounded-full border border-(--chip-line) bg-(--chip-bg) text-sea-ink transition hover:border-lagoon-deep"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
        <div className="mr-11 grid grid-cols-3 gap-1 rounded-full border border-(--chip-line) bg-(--chip-bg) p-1">
          {(['expense', 'income', 'transfer'] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={
                mode === type
                  ? 'rounded-full bg-(--surface-strong) px-3 py-1.5 text-sm font-bold text-sea-ink shadow-sm'
                  : 'rounded-full px-3 py-1.5 text-sm font-semibold text-sea-ink-soft'
              }
              onClick={() => switchMode(type)}
            >
              {type[0].toUpperCase()}
              {type.slice(1)}
            </button>
          ))}
        </div>
        <div className="mt-5 text-center">
          <p className="island-kicker">Amount (MWK)</p>
          <p
            className={`font-mono mt-1 text-[2.6rem] font-bold tracking-tight tabular-nums ${amount ? 'text-sea-ink' : 'text-sea-ink-soft/50'}`}
          >
            {amountDisplay}
          </p>
          {initial.reconcile && (
            <span className="mt-1 inline-flex rounded-full border border-(--chip-line) bg-(--chip-bg) px-2.5 py-1 text-[0.72rem] font-bold text-[#c05a40]">
              Reconcile · 30 Jul
            </span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map(
            (key) => (
              <button
                key={key}
                type="button"
                className="font-mono grid place-items-center rounded-2xl border border-(--line) bg-(--chip-bg) py-3.5 text-lg font-semibold text-sea-ink transition hover:border-lagoon-deep active:scale-95"
                onClick={() => appendDigits(key)}
              >
                {key}
              </button>
            ),
          )}
          <button
            type="button"
            aria-label="Delete digit"
            className="font-mono grid place-items-center rounded-2xl border border-(--line) bg-(--chip-bg) py-3.5 text-lg font-semibold text-sea-ink transition hover:border-lagoon-deep active:scale-95"
            onClick={() => setDigits((current) => current.slice(0, -1))}
          >
            <Delete className="size-5" />
          </button>
        </div>
        {mode === 'expense' && (
          <>
            <div className="mt-5">
              <p className="mb-2 text-[0.72rem] font-bold tracking-widest text-sea-ink-soft uppercase">
                One-tap recents
              </p>
              <RecentChips onSelect={selectRecent} />
            </div>
            <div className="mt-5">
              <p className="mb-2 text-[0.72rem] font-bold tracking-widest text-sea-ink-soft uppercase">
                Category
              </p>
              <div className="flex flex-wrap gap-2">
                {categories
                  .filter((category) => category.id !== 'adjustment')
                  .map((category) => {
                    const Icon = category.icon
                    return (
                      <button
                        key={category.id}
                        type="button"
                        className={
                          categoryId === category.id
                            ? 'flex items-center gap-1.5 rounded-full border border-lagoon-deep bg-lagoon-deep/10 px-3 py-1.5 text-sm font-semibold text-sea-ink transition'
                            : 'flex items-center gap-1.5 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5 text-sm font-semibold text-sea-ink-soft transition hover:border-lagoon-deep'
                        }
                        onClick={() => setCategoryId(category.id)}
                      >
                        <Icon
                          className="size-4"
                          style={{ color: category.color }}
                        />
                        {category.name}
                      </button>
                    )
                  })}
              </div>
            </div>
          </>
        )}
        {mode === 'transfer' ? (
          <>
            <AccountPicker
              label="From account"
              selected={accountId}
              onSelect={setAccountId}
            />
            <AccountPicker
              label="To account"
              selected={toAccountId}
              onSelect={setToAccountId}
            />
          </>
        ) : (
          <AccountPicker
            label={mode === 'income' ? 'Into account' : 'From account'}
            selected={accountId}
            onSelect={setAccountId}
          />
        )}
        {mode !== 'transfer' && (
          <div className="mt-5">
            <label className="mb-2 block text-[0.72rem] font-bold tracking-widest text-sea-ink-soft uppercase">
              Payee
            </label>
            <input
              className="w-full rounded-xl border border-(--line) bg-(--chip-bg) px-4 py-2.5 text-sm font-semibold text-sea-ink placeholder:font-normal placeholder:text-sea-ink-soft/60 focus:border-lagoon-deep focus:outline-none"
              placeholder="e.g. Chipiku"
              value={payee}
              onChange={(event) => setPayee(event.target.value)}
            />
          </div>
        )}
        {mode === 'expense' && (
          <div className="mt-4">
            <input
              className="w-full rounded-xl border border-(--line) bg-(--chip-bg) px-4 py-2.5 text-sm font-semibold text-sea-ink placeholder:font-normal placeholder:text-sea-ink-soft/60 focus:border-lagoon-deep focus:outline-none"
              placeholder="Items — milk, bread… (optional)"
              value={items}
              onChange={(event) => setItems(event.target.value)}
            />
            <p className="mt-1.5 text-[0.72rem] text-sea-ink-soft italic">
              Items answer 'how much on milk?' later.
            </p>
          </div>
        )}
        {mode === 'income' && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-palm/10 px-3.5 py-3">
            <PiggyBank className="size-4 shrink-0 text-palm" />
            <p className="text-[0.82rem] font-semibold text-sea-ink">
              Auto-save 20% — Misi will propose{' '}
              <span className="font-mono tabular-nums">
                {formatK(Math.round(amount * 0.2))}
              </span>{' '}
              → Savings.
            </p>
          </div>
        )}
        <div className="mt-5 flex gap-2.5">
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-2 text-sm font-semibold text-sea-ink">
            <Calendar className="size-4" />
            Today
          </span>
          <input
            className="min-w-0 flex-1 rounded-xl border border-(--line) bg-(--chip-bg) px-4 py-2.5 text-sm font-semibold text-sea-ink placeholder:font-normal placeholder:text-sea-ink-soft/60 focus:border-lagoon-deep focus:outline-none"
            placeholder="Note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={!canSave}
          className="btn-primary mt-6 w-full rounded-full py-3.5 font-bold shadow-lg transition hover:brightness-110 disabled:opacity-45 disabled:hover:brightness-100"
          onClick={save}
        >
          {saveLabel}
        </button>
      </section>
    </div>
  )
}
