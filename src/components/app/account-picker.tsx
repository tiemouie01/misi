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
}: {
  label: string
  accounts: Account[]
  selected: string
  onSelect: (id: string) => void
  className?: string
}) {
  return (
    <fieldset className={cn('mt-5', className)}>
      <legend className="field-label mb-2">{label}</legend>
      <div className="flex min-w-0 flex-wrap gap-2">
        {accounts
          .filter((account) => isSpendableAccount(account))
          .map((account) => (
            <Button
              key={account.id}
              type="button"
              aria-pressed={selected === account.id}
              variant="secondary"
              size="sm"
              className="max-w-full aria-pressed:border-lagoon-deep aria-pressed:bg-lagoon-deep/10 aria-pressed:text-sea-ink"
              onClick={() => onSelect(account.id)}
            >
              <span className="truncate">{account.name}</span>
            </Button>
          ))}
      </div>
    </fieldset>
  )
}
