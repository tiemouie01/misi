import { useMutation } from 'convex/react'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import {
  DEFAULT_PAYDAY_DAY,
  resolveCyclePeriod,
} from '../../../shared/cycle-period'
import { SettingsSection } from '#/components/settings/settings-section'
import { useSettingsData } from '#/components/settings/use-settings-data'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { errorMessage } from '#/lib/error-message'
import { updateSettingsOptimistically } from '#/lib/optimistic-settings'
import { ordinal } from '#/lib/utils'

const DAY_MS = 86_400_000
const PAYDAY_DAYS = Array.from({ length: 28 }, (_, index) => index + 1)

const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Blantyre',
})

function cycleRange(period: { startsAt: number; endsAt: number }) {
  const days = Math.round((period.endsAt + 1 - period.startsAt) / DAY_MS)
  return `${shortDateFormat.format(new Date(period.startsAt))} – ${shortDateFormat.format(new Date(period.endsAt))} · ${days} days`
}

export function CycleSection() {
  const { settings, currentCycle } = useSettingsData()
  const updateSettings = useMutation(
    api.misi.updateSettings,
  ).withOptimisticUpdate(updateSettingsOptimistically)
  const [draft, setDraft] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  if (!settings || !currentCycle)
    return <SettingsSection title="Payday" icon={CalendarDays} />

  const savedDay = settings.paydayDay ?? DEFAULT_PAYDAY_DAY
  const paydayDay = draft ?? savedDay
  const changed = paydayDay !== savedDay
  // A new payday only applies from the next cycle, which may run longer or
  // shorter than a month to line up with it.
  const nextCycle = resolveCyclePeriod(
    currentCycle.endsAt + 1,
    paydayDay,
    currentCycle,
  )

  async function save() {
    if (!changed || saving) return
    setSaving(true)
    try {
      await updateSettings({ paydayDay })
      setDraft(null)
      toast.success(`Payday set to the ${ordinal(paydayDay)}`)
    } catch (caught) {
      toast.error(errorMessage(caught, 'Unable to save payday. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection
      title="Payday"
      icon={CalendarDays}
      description="Each budget cycle runs from payday to the day before the next one."
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="settings-payday">Payday each month</Label>
          <Select
            value={String(paydayDay)}
            disabled={saving}
            onValueChange={(value) => setDraft(Number(value))}
          >
            <SelectTrigger id="settings-payday" className="mt-2 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYDAY_DAYS.map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {ordinal(day)} of the month
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <dl className="grid gap-3 rounded-2xl bg-lagoon-deep/6 px-4 py-3 sm:grid-cols-2">
          <div>
            <dt className="field-label">This cycle</dt>
            <dd className="mt-1 text-sm font-semibold text-sea-ink">
              {cycleRange(currentCycle)}
            </dd>
          </div>
          <div>
            <dt className="field-label">Next cycle</dt>
            <dd className="mt-1 text-sm font-semibold text-sea-ink">
              {cycleRange(nextCycle)}
            </dd>
          </div>
        </dl>
        {changed && (
          <p
            role="status"
            className="rounded-2xl bg-lagoon-deep/8 px-4 py-3 text-sm font-semibold text-sea-ink"
          >
            Takes effect from your next cycle. This cycle keeps its dates.
          </p>
        )}
        {changed && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => setDraft(null)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save payday'}
            </Button>
          </div>
        )}
      </div>
    </SettingsSection>
  )
}
