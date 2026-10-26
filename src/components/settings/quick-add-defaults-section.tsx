import { useMutation } from 'convex/react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { SettingsSection } from '#/components/settings/settings-section'
import { useSettingsData } from '#/components/settings/use-settings-data'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { resolveQuickAddDefaults } from '#/lib/app-data'
import { errorMessage } from '#/lib/error-message'
import { updateSettingsOptimistically } from '#/lib/optimistic-settings'

import type { Id } from '../../../convex/_generated/dataModel'
import type { Account } from '#/lib/app-data'

type DefaultField =
  | 'defaultExpenseAccountId'
  | 'defaultTransferFromAccountId'
  | 'defaultTransferToAccountId'

const FIELDS: Array<{
  field: DefaultField
  resolved: keyof ReturnType<typeof resolveQuickAddDefaults>
  label: string
  fallback: string
}> = [
  {
    field: 'defaultExpenseAccountId',
    resolved: 'expense',
    label: 'Expenses and income',
    fallback: 'your first spendable account',
  },
  {
    field: 'defaultTransferFromAccountId',
    resolved: 'transferFrom',
    label: 'Transfers from',
    fallback: 'your first spendable account',
  },
  {
    field: 'defaultTransferToAccountId',
    resolved: 'transferTo',
    label: 'Transfers to',
    fallback: 'your next spendable account',
  },
]

export function QuickAddDefaultsSection() {
  const { settings, accounts } = useSettingsData()
  const updateSettings = useMutation(
    api.misi.updateSettings,
  ).withOptimisticUpdate(updateSettingsOptimistically)

  if (!settings) return <SettingsSection title="Quick-add defaults" />

  const activeAccounts = accounts.filter((account) => !account.archived)
  const resolved = resolveQuickAddDefaults(accounts, settings)
  const isActive = (id: string | undefined) =>
    activeAccounts.some((account) => account.id === id)

  async function save(field: DefaultField, account: Account) {
    try {
      await updateSettings({ [field]: account.id as Id<'accounts'> })
      toast.success('Quick-add default saved')
    } catch (caught) {
      toast.error(errorMessage(caught, 'Unable to save default. Try again.'))
    }
  }

  return (
    <SettingsSection
      title="Quick-add defaults"
      description="The accounts quick-add starts on. You can still switch accounts on each entry."
    >
      <div className="space-y-4">
        {FIELDS.map(({ field, resolved: key, label, fallback }) => {
          const value = resolved[key]
          const id = `settings-${field}`
          const unset = !isActive(settings[field])
          return (
            <div key={field}>
              <Label htmlFor={id}>{label}</Label>
              <Select
                value={value}
                onValueChange={(next) => {
                  const account = activeAccounts.find(
                    (candidate) => candidate.id === next,
                  )
                  if (account) void save(field, account)
                }}
              >
                <SelectTrigger
                  id={id}
                  className="mt-2 w-full"
                  aria-describedby={unset ? `${id}-hint` : undefined}
                >
                  <SelectValue placeholder="Choose an account" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {unset && (
                <p
                  id={`${id}-hint`}
                  className="mt-1.5 text-[0.8rem] text-sea-ink-soft"
                >
                  Not set, so quick-add uses {fallback}.
                </p>
              )}
            </div>
          )
        })}
        {activeAccounts.length > 1 &&
          resolved.transferFrom === resolved.transferTo && (
            <p
              role="status"
              className="rounded-xl bg-coral/8 px-4 py-3 text-sm font-semibold text-coral-deep"
            >
              Transfers start with the same account on both sides. Pick a
              different one for "Transfers to".
            </p>
          )}
      </div>
    </SettingsSection>
  )
}
