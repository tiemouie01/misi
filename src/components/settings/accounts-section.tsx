import { Link } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { ArchiveRestore, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { AddAccountDialog } from '#/components/app/net-worth-card'
import { useQuickAdd } from '#/components/app/quick-add-provider'
import { SettingsSection } from '#/components/settings/settings-section'
import { useSettingsData } from '#/components/settings/use-settings-data'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { formatAccountAmount, isSpendableAccount } from '#/lib/app-data'
import { errorMessage } from '#/lib/error-message'
import { ACCOUNT_KIND_LABELS } from '#/lib/onboarding-data'
import { patchAccountOptimistically } from '#/lib/optimistic-settings'
import { cn } from '#/lib/utils'

import type { Id } from '../../../convex/_generated/dataModel'
import type { NewAccountInput } from '#/components/app/net-worth-card'
import type { Account } from '#/lib/app-data'

const ACCOUNT_KINDS: Account['kind'][] = [
  'bank',
  'mobile',
  'cash',
  'investment',
]

function accountMeta(account: Account) {
  return `${ACCOUNT_KIND_LABELS[account.kind]} · ${account.currency}`
}

export function AccountsSection() {
  const { accounts } = useSettingsData()
  const { openSheet } = useQuickAdd()
  const createAccount = useMutation(api.misi.createAccount)
  const setSpendable = useMutation(
    api.misi.setAccountSpendable,
  ).withOptimisticUpdate((localStore, args) =>
    patchAccountOptimistically(localStore, args.accountId, {
      includeInSpendable: args.includeInSpendable,
    }),
  )
  const restoreAccount = useMutation(api.misi.restoreAccount)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [removing, setRemoving] = useState<Account | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const archivedListId = useId()

  const active = accounts.filter((account) => !account.archived)
  const archived = accounts.filter((account) => account.archived)

  async function addAccount(input: NewAccountInput) {
    await createAccount(input)
    toast.success(`${input.name} added`)
  }

  async function toggleSpendable(
    account: Account,
    includeInSpendable: boolean,
  ) {
    try {
      await setSpendable({
        accountId: account.id as Id<'accounts'>,
        includeInSpendable,
      })
      toast.success(
        includeInSpendable
          ? `${account.name} now counts toward spendable`
          : `${account.name} no longer counts toward spendable`,
      )
    } catch (caught) {
      toast.error(errorMessage(caught, 'Unable to update account. Try again.'))
    }
  }

  async function restore(account: Account) {
    if (restoringId) return
    setRestoringId(account.id)
    try {
      await restoreAccount({ accountId: account.id as Id<'accounts'> })
      toast.success(`${account.name} restored`)
    } catch (caught) {
      toast.error(errorMessage(caught, 'Unable to restore account. Try again.'))
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <SettingsSection
      title="Accounts"
      description="Rename accounts, choose which count toward spendable, or remove ones you no longer use."
    >
      <div className="-my-1 flex flex-col">
        {active.map((account, index) => (
          <AccountRow
            key={account.id}
            account={account}
            divided={index > 0}
            onToggleSpendable={(checked) =>
              void toggleSpendable(account, checked)
            }
            onEdit={() => setEditing(account)}
            onRemove={() => setRemoving(account)}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        className="mt-4 w-full sm:w-auto"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="size-4" />
        Add account
      </Button>

      {archived.length > 0 && (
        <div className="mt-5 border-t border-dashed border-(--line) pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={showArchived}
            aria-controls={archivedListId}
            className="-ml-3 h-10 sm:h-8"
            onClick={() => setShowArchived((current) => !current)}
          >
            <ChevronDown
              className={cn(
                'size-4 transition-transform',
                showArchived && 'rotate-180',
              )}
            />
            Archived ({archived.length})
          </Button>
          {showArchived && (
            <div id={archivedListId} className="mt-2">
              <p className="text-[0.8rem] text-sea-ink-soft">
                Kept so past transactions still show them. Restore one to use it
                again.
              </p>
              <div className="mt-1 flex flex-col">
                {archived.map((account, index) => (
                  <div
                    key={account.id}
                    className={cn(
                      'flex items-center gap-3 py-3',
                      index > 0 && 'border-t border-(--line)',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-sea-ink-soft">
                        {account.name}
                      </p>
                      <p className="text-xs font-semibold text-sea-ink-soft">
                        {accountMeta(account)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-10 sm:h-8"
                      disabled={restoringId !== null}
                      aria-label={`Restore ${account.name}`}
                      onClick={() => void restore(account)}
                    >
                      <ArchiveRestore className="size-4" />
                      {restoringId === account.id ? 'Restoring…' : 'Restore'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AddAccountDialog
        open={addOpen}
        accounts={accounts}
        onOpenChange={setAddOpen}
        onCreateAccount={addAccount}
      />
      {editing && (
        <EditAccountDialog
          key={editing.id}
          account={editing}
          onClose={() => setEditing(null)}
        />
      )}
      <RemoveAccountDialog
        account={removing}
        isLastAccount={active.length <= 1}
        onClose={() => setRemoving(null)}
        onAddAccount={() => {
          setRemoving(null)
          setAddOpen(true)
        }}
        onMoveMoney={(account) => {
          setRemoving(null)
          const others = active.filter((other) => other.id !== account.id)
          const destination =
            others.find(
              (other) =>
                other.currency === account.currency &&
                isSpendableAccount(other),
            ) ?? others.at(0)
          openSheet({
            mode: 'transfer',
            accountId: account.id,
            ...(destination ? { toAccountId: destination.id } : {}),
            ...(account.balance > 0
              ? { amount: account.balance, amountCurrency: account.currency }
              : {}),
          })
        }}
      />
    </SettingsSection>
  )
}

function AccountRow({
  account,
  divided,
  onToggleSpendable,
  onEdit,
  onRemove,
}: {
  account: Account
  divided: boolean
  onToggleSpendable: (checked: boolean) => void
  onEdit: () => void
  onRemove: () => void
}) {
  const switchId = useId()

  return (
    <div
      className={cn(
        'flex flex-col gap-2 py-3',
        divided && 'border-t border-(--line)',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-sea-ink">{account.name}</p>
          <p className="text-xs font-semibold text-sea-ink-soft">
            {accountMeta(account)}
          </p>
        </div>
        <p className="font-mono shrink-0 font-semibold text-sea-ink tabular-nums">
          {formatAccountAmount(account)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Switch
            id={switchId}
            aria-label={`Counts toward spendable: ${account.name}`}
            checked={isSpendableAccount(account)}
            onCheckedChange={onToggleSpendable}
          />
          <Label
            htmlFor={switchId}
            className="mb-0 text-sm! font-semibold! normal-case! tracking-normal! text-sea-ink-soft"
          >
            Counts toward spendable
          </Label>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="sm:size-8"
            aria-label={`Edit ${account.name}`}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-coral-deep hover:text-coral-deep sm:size-8"
            aria-label={`Remove ${account.name}`}
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function EditAccountDialog({
  account,
  onClose,
}: {
  account: Account
  onClose: () => void
}) {
  const updateAccount = useMutation(
    api.misi.updateAccount,
  ).withOptimisticUpdate((localStore, args) =>
    patchAccountOptimistically(localStore, args.accountId, {
      name: args.name.trim(),
      kind: args.kind,
    }),
  )
  const [name, setName] = useState(account.name)
  const [kind, setKind] = useState(account.kind)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const changed = name.trim() !== account.name || kind !== account.kind
  const canSave = name.trim() !== '' && changed && !saving

  async function save() {
    if (!canSave) return
    setError(null)
    setSaving(true)
    try {
      await updateAccount({
        accountId: account.id as Id<'accounts'>,
        name,
        kind,
      })
      toast.success('Account updated')
      onClose()
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to update account. Try again.'))
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose()
      }}
    >
      <DialogContent
        sheet
        className="rounded-3xl border-(--line) bg-(--surface-strong) sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Edit account</DialogTitle>
          <DialogDescription>
            Currency ({account.currency}) and balance stay as they are. Use
            reconcile to correct a balance.
          </DialogDescription>
        </DialogHeader>
        <form
          id="edit-account-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <div>
            <Label htmlFor="edit-account-name">Name</Label>
            <Input
              id="edit-account-name"
              className="mt-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-account-kind">Type</Label>
            <Select
              value={kind}
              onValueChange={(value) => {
                const next = ACCOUNT_KINDS.find((item) => item === value)
                if (next) setKind(next)
              }}
            >
              <SelectTrigger id="edit-account-kind" className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_KINDS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {ACCOUNT_KIND_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
          >
            {error}
          </p>
        )}
        <DialogFooter sticky>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-account-form" disabled={!canSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RemoveAccountDialog({
  account,
  isLastAccount,
  onClose,
  onAddAccount,
  onMoveMoney,
}: {
  account: Account | null
  isLastAccount: boolean
  onClose: () => void
  onAddAccount: () => void
  onMoveMoney: (account: Account) => void
}) {
  const removeAccount = useMutation(api.misi.removeAccount)
  const [busy, setBusy] = useState(false)
  // Keep the last account on screen while the dialog animates closed.
  const [shown, setShown] = useState(account)
  if (account && account !== shown) setShown(account)

  async function remove() {
    if (!account || busy) return
    setBusy(true)
    try {
      const { outcome } = await removeAccount({
        accountId: account.id as Id<'accounts'>,
      })
      toast.success(
        outcome === 'archived'
          ? `${account.name} archived`
          : `${account.name} deleted`,
      )
      onClose()
    } catch (caught) {
      toast.error(errorMessage(caught, 'Unable to remove account. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  const current = account ?? shown
  const hasBalance = current !== null && current.balance !== 0

  return (
    <AlertDialog
      open={account !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <AlertDialogContent>
        {current &&
          (hasBalance ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Empty {current.name} first</AlertDialogTitle>
                <AlertDialogDescription>
                  Only accounts with a zero balance can be removed, and{' '}
                  {current.name} has {formatAccountAmount(current)}. Move the
                  money to another account
                  {isSpendableAccount(current)
                    ? ", or reconcile if Misi's balance is off."
                    : '.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
                {isSpendableAccount(current) && (
                  <Button asChild variant="secondary">
                    <Link
                      to="/app/settings"
                      search={{ task: 'reconcile' }}
                      onClick={onClose}
                    >
                      Reconcile
                    </Link>
                  </Button>
                )}
                {!isLastAccount && (
                  <Button type="button" onClick={() => onMoveMoney(current)}>
                    Move money
                  </Button>
                )}
              </AlertDialogFooter>
            </>
          ) : isLastAccount ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Add another account first</AlertDialogTitle>
                <AlertDialogDescription>
                  You need at least one account. Add another, then you can
                  remove {current.name}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
                <Button type="button" onClick={onAddAccount}>
                  <Plus className="size-4" />
                  Add account
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {current.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  If it has past transactions, it's archived: hidden from
                  pickers and balances but kept so your history still shows it.
                  You can restore it later. If it has none, it's deleted for
                  good.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  {busy ? 'Removing…' : 'Remove account'}
                </Button>
              </AlertDialogFooter>
            </>
          ))}
      </AlertDialogContent>
    </AlertDialog>
  )
}
