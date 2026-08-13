import {
  createContext,
  useContext,
  useEffect,
  useState
  
} from 'react'
import type {ReactNode} from 'react';
import { PowerSyncContext } from '@powersync/react'
import { PowerSyncDatabase, WASQLiteOpenFactory } from '@powersync/web'
import { useConvex, useConvexAuth } from 'convex/react'

import { authClient } from '#/lib/auth-client'
import { AppSchema } from '#/lib/powersync/AppSchema'
import { BackendConnector } from '#/lib/powersync/BackendConnector'

let powerSyncDb: PowerSyncDatabase | null = null

function getOrCreateDb() {
  if (typeof window === 'undefined') {
    return null
  }

  if (!powerSyncDb) {
    powerSyncDb = new PowerSyncDatabase({
      database: new WASQLiteOpenFactory({
        dbFilename: 'misi.db',
      }),
      schema: AppSchema,
    })
  }

  return powerSyncDb
}

/** Browser-only PowerSync database instance (null during SSR). */
export function getPowerSyncDb() {
  return getOrCreateDb()
}

const ConnectorContext = createContext<BackendConnector | null>(null)

export function useConnector() {
  return useContext(ConnectorContext)
}

function BrowserPowerSyncProvider({ children }: { children: ReactNode }) {
  const db = getOrCreateDb()!
  const convexClient = useConvex()
  const { isAuthenticated } = useConvexAuth()
  const { data: session } = authClient.useSession()
  const [connector] = useState(() => new BackendConnector({ convexClient }))
  const [authToken, setAuthToken] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function syncToken() {
      if (!session?.session) {
        connector.setAuthToken(null)
        if (!cancelled) setAuthToken(null)
        return
      }

      const { data } = await authClient.convex.token({
        fetchOptions: { throw: false },
      })
      const token = data?.token ?? null
      connector.setAuthToken(token)
      if (!cancelled) setAuthToken(token)
    }

    void syncToken()

    return () => {
      cancelled = true
    }
  }, [session?.session, connector])

  useEffect(() => {
    if (authToken && isAuthenticated) {
      void db.connect(connector)
    } else {
      void db.disconnect()
    }
  }, [authToken, connector, isAuthenticated, db])

  return (
    <PowerSyncContext.Provider value={db}>
      <ConnectorContext.Provider value={connector}>
        {children}
      </ConnectorContext.Provider>
    </PowerSyncContext.Provider>
  )
}

export default function PowerSyncProvider({
  children,
}: {
  children: ReactNode
}) {
  if (typeof window === 'undefined') {
    return children
  }

  return <BrowserPowerSyncProvider>{children}</BrowserPowerSyncProvider>
}
