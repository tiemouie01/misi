import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { api } from '../../../convex/_generated/api'
import { mapAccount } from '#/lib/app-data'

const bootstrapQuery = convexQuery(api.misi.bootstrap, {})

/** Bootstrap data the settings sections share; accounts include archived. */
export function useSettingsData() {
  const { data } = useSuspenseQuery(bootstrapQuery)
  const accounts = useMemo(
    () => (data?.accounts ?? []).map(mapAccount),
    [data?.accounts],
  )
  return {
    settings: data?.settings ?? null,
    currentCycle: data?.currentCycle ?? null,
    accounts,
  }
}
