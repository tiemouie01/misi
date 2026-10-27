import { Button } from '#/components/ui/button'
import { isSpendableAccount } from '#/lib/app-data'
import { cn } from '#/lib/utils'

import type { Account } from '#/lib/app-data'

export function AccountPicker({
  label,
  accounts,
  selected,
  onSelect,
  className,
  includeAll = false,
}: {
  label: string
  accounts: Account[]
  selected: string
  onSelect: (id: string) => void
  className?: string
  includeAll?: boolean
}) {
  // Keep the selected account visible even when it is not spendable, e.g.
  // when editing an old transaction, so the choice is never hidden.
  const visibleAccounts = includeAll
    ? accounts
    : accounts.filter(
        (account) => isSpendableAccount(account) || account.id === selected,
      )

  return (
    <fieldset className={cn('mt-5', className)}>
      <legend className="field-label mb-2">{label}</legend>
      <div className="flex min-w-0 flex-wrap gap-2">
        {visibleAccounts.map((account) => (
          <Button
            key={account.id}
            type="button"
            aria-pressed={selected === account.id}
            variant="chip"
            size="chip"
            className="max-w-full"
            onClick={() => onSelect(account.id)}
          >
            <span className="truncate">{account.name}</span>
          </Button>
        ))}
      </div>
    </fieldset>
  )
}
