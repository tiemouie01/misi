import { Trash2 } from 'lucide-react'

import { Button } from '#/components/ui/button'
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
import { ACCOUNT_KIND_LABELS, formatAmountInput } from '#/lib/onboarding-data'

import type { Account } from '#/lib/app-data'
import type { DraftAccount } from '#/lib/onboarding-data'

const accountKinds: Account['kind'][] = ['bank', 'mobile', 'cash', 'investment']

/** One account's editable fields, shared by onboarding and the in-app add flow. */
export function AccountDraftFields({
  account,
  onChange,
  onRemove,
}: {
  account: DraftAccount
  onChange: (patch: Partial<DraftAccount>) => void
  onRemove?: () => void
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-(--line) p-3">
      {!account.isPreset ? (
        <div className="flex items-start gap-2">
          <Input
            aria-label="Account name"
            placeholder="Account name"
            value={account.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove ${account.name || 'account'}`}
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ) : (
        <p className="text-[0.9rem] font-semibold text-sea-ink">
          {account.name}
        </p>
      )}
      <div className="flex gap-2">
        {!account.isPreset && (
          <>
            <Select
              value={account.kind}
              onValueChange={(value) =>
                onChange({
                  kind: value as Account['kind'],
                  includeInSpendable: value !== 'investment',
                })
              }
            >
              <SelectTrigger
                aria-label="Account type"
                className="h-10 w-auto rounded-xl"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountKinds.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {ACCOUNT_KIND_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={account.currency}
              onValueChange={(value) =>
                onChange({ currency: value as Account['currency'] })
              }
            >
              <SelectTrigger
                aria-label="Currency"
                className="h-10 w-auto rounded-xl"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MWK">MWK</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
        <Input
          aria-label={`${account.name || 'Account'} balance`}
          inputMode="numeric"
          placeholder={
            account.currency === 'USD' ? 'Balance ($)' : 'Balance (K)'
          }
          value={account.balance}
          onChange={(event) =>
            onChange({ balance: formatAmountInput(event.target.value) })
          }
        />
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <Label
          htmlFor={`ob-spendable-${account.key}`}
          className="font-bold text-sea-ink"
        >
          Counts toward spendable
        </Label>
        <Switch
          id={`ob-spendable-${account.key}`}
          checked={account.includeInSpendable}
          onCheckedChange={(checked) =>
            onChange({ includeInSpendable: checked })
          }
        />
      </div>
    </div>
  )
}
