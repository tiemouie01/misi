import { api } from '../../convex/_generated/api'

import type { OptimisticLocalStore } from 'convex/browser'
import type { FunctionArgs } from 'convex/server'

type UpdateSettingsArgs = FunctionArgs<typeof api.misi.updateSettings>

/**
 * Shows a settings change straight away instead of after the round-trip;
 * Convex replaces it with the server's answer or rolls it back on failure.
 * Callers pass only the fields they change (no explicit undefineds).
 */
export function updateSettingsOptimistically(
  localStore: OptimisticLocalStore,
  args: UpdateSettingsArgs,
) {
  const bootstrap = localStore.getQuery(api.misi.bootstrap, {})
  if (!bootstrap?.settings) return
  localStore.setQuery(
    api.misi.bootstrap,
    {},
    { ...bootstrap, settings: { ...bootstrap.settings, ...args } },
  )
}

/** Same idea for the account fields Settings edits in place. */
export function patchAccountOptimistically(
  localStore: OptimisticLocalStore,
  accountId: string,
  patch: {
    name?: string
    kind?: 'bank' | 'mobile' | 'cash' | 'investment'
    includeInSpendable?: boolean
  },
) {
  const bootstrap = localStore.getQuery(api.misi.bootstrap, {})
  if (!bootstrap) return
  localStore.setQuery(
    api.misi.bootstrap,
    {},
    {
      ...bootstrap,
      accounts: bootstrap.accounts.map((account) =>
        account._id === accountId ? { ...account, ...patch } : account,
      ),
    },
  )
}
