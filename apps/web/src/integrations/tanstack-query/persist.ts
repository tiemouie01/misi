import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

import type { QueryClient } from '@tanstack/react-query'

/** Must match the page cache in public/sw.js. */
const PAGE_CACHE = 'misi-pages-v1'

const persister =
  typeof window === 'undefined'
    ? null
    : createAsyncStoragePersister({
        storage: window.localStorage,
        key: 'misi-query-cache',
      })

let stopPersisting: (() => void) | null = null

/**
 * Keeps the last Convex results on the device so an offline launch shows them.
 * The page the service worker caches carries SSR data from its last full load;
 * this is usually newer, and hydration keeps whichever copy is fresher.
 */
export function persistQueries(queryClient: QueryClient) {
  if (!persister) return
  ;[stopPersisting] = persistQueryClient({
    queryClient,
    persister,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

/** Drops cached pages and data so the next person on this device sees none. */
export async function clearOfflineData() {
  stopPersisting?.()
  await Promise.all([persister?.removeClient(), caches.delete(PAGE_CACHE)])
}
