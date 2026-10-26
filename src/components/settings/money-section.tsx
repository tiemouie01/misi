import { useMutation } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { SettingsSection } from '#/components/settings/settings-section'
import { useSettingsData } from '#/components/settings/use-settings-data'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { errorMessage } from '#/lib/error-message'
import { formatAmountInput, parseAmount } from '#/lib/onboarding-data'
import { updateSettingsOptimistically } from '#/lib/optimistic-settings'

export function MoneySection() {
  const { settings } = useSettingsData()
  const updateSettings = useMutation(
    api.misi.updateSettings,
  ).withOptimisticUpdate(updateSettingsOptimistically)
  // null = untouched, so the field follows the saved value.
  const [usdDraft, setUsdDraft] = useState<string | null>(null)
  const [savingsDraft, setSavingsDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!settings) return <SettingsSection title="Money" />

  const savedUsd = formatAmountInput(String(settings.usdRate))
  const savedSavings = String(Math.round(settings.defaultSavingsRate * 100))
  const usdValue = usdDraft ?? savedUsd
  const savingsValue = savingsDraft ?? savedSavings
  const usdRate = parseAmount(usdValue)
  const savingsPct = Number(savingsValue)
  const usdChanged = usdRate !== settings.usdRate
  const savingsChanged =
    savingsValue !== '' && savingsPct / 100 !== settings.defaultSavingsRate
  const usdInvalid = usdValue.trim() === '' || usdRate <= 0
  const savingsInvalid = savingsValue === ''
  const dirty = usdDraft !== null || savingsDraft !== null
  const canSave =
    (usdChanged || savingsChanged) && !usdInvalid && !savingsInvalid && !saving

  function reset() {
    setUsdDraft(null)
    setSavingsDraft(null)
  }

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      await updateSettings({
        ...(usdChanged ? { usdRate } : {}),
        ...(savingsChanged ? { defaultSavingsRate: savingsPct / 100 } : {}),
      })
      reset()
      toast.success('Money settings saved')
    } catch (caught) {
      toast.error(errorMessage(caught, 'Unable to save. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection title="Money">
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <div>
          <Label htmlFor="settings-usd-rate">USD rate (K per $1)</Label>
          <Input
            id="settings-usd-rate"
            className="mt-2"
            inputMode="decimal"
            value={usdValue}
            aria-invalid={usdInvalid || undefined}
            aria-describedby={
              usdInvalid
                ? 'settings-usd-rate-error settings-usd-rate-hint'
                : 'settings-usd-rate-hint'
            }
            onChange={(event) =>
              setUsdDraft(formatAmountInput(event.target.value))
            }
          />
          {usdInvalid && (
            <p
              id="settings-usd-rate-error"
              className="mt-1.5 text-[0.8rem] font-semibold text-coral-deep"
            >
              Enter a rate above zero.
            </p>
          )}
          <p
            id="settings-usd-rate-hint"
            className="mt-1.5 text-[0.8rem] text-sea-ink-soft"
          >
            Converts USD balances into kwacha for net worth and spendable. New
            USD transactions use this rate; past ones keep theirs.
          </p>
        </div>
        <div>
          <Label htmlFor="settings-savings-rate">
            Default savings rate (% of income)
          </Label>
          <div className="relative mt-2">
            <Input
              id="settings-savings-rate"
              className="pr-9"
              inputMode="numeric"
              value={savingsValue}
              aria-invalid={savingsInvalid || undefined}
              aria-describedby={
                savingsInvalid
                  ? 'settings-savings-rate-error settings-savings-rate-hint'
                  : 'settings-savings-rate-hint'
              }
              onChange={(event) => {
                const digits = event.target.value.replace(/[^\d]/g, '')
                setSavingsDraft(
                  digits === '' ? '' : String(Math.min(100, Number(digits))),
                )
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-semibold text-sea-ink-soft"
            >
              %
            </span>
          </div>
          {savingsInvalid && (
            <p
              id="settings-savings-rate-error"
              className="mt-1.5 text-[0.8rem] font-semibold text-coral-deep"
            >
              Enter a percentage from 0 to 100.
            </p>
          )}
          <p
            id="settings-savings-rate-hint"
            className="mt-1.5 text-[0.8rem] text-sea-ink-soft"
          >
            The starting rate for new income sources, and the auto-save rate for
            income that isn't linked to a source. Each income source keeps its
            own rate.
          </p>
        </div>
        {dirty && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={reset}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </form>
    </SettingsSection>
  )
}
