import { ConvexProviderWithAuth } from 'convex/react'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

import { authClient } from '#/lib/auth-client'

import type { ConvexReactClient } from 'convex/react'
import type { ReactNode, RefObject } from 'react'

const TOKEN_REQUEST_TIMEOUT_MS = 10_000
const MAX_RETRY_DELAY_MS = 30_000

/** Waits out a backoff step, or less if the browser reports it is back online. */
function waitToRetry(attempt: number) {
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer)
      window.removeEventListener('online', done)
      resolve()
    }
    const timer = setTimeout(
      done,
      Math.min(1_000 * 2 ** attempt, MAX_RETRY_DELAY_MS),
    )
    window.addEventListener('online', done)
  })
}

let pendingToken: Promise<string | null> | null = null

/**
 * Convex clears auth for good once a token fetch resolves null, and nothing
 * asks again while the Better Auth session looks unchanged. So only a definite
 * "no session" from the auth server may end in null. Network failures, common
 * when a phone resumes a suspended tab before its connection is back, retry.
 */
function fetchConvexToken() {
  pendingToken ??= (async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        const { data, error } = await authClient.convex.token({
          fetchOptions: {
            throw: false,
            signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
          },
        })
        if (data?.token) return data.token
        if (!error || error.status === 401 || error.status === 403) return null
      } catch {
        // Offline, timed out, or the request died with the suspended tab.
      }
      await waitToRetry(attempt)
    }
  })().finally(() => {
    pendingToken = null
  })
  return pendingToken
}

type InitialAuth = {
  hasToken: boolean
  tokenRef: RefObject<string | null>
}

const InitialAuthContext = createContext<InitialAuth>({
  hasToken: false,
  tokenRef: { current: null },
})

function useAuthFromBetterAuth() {
  const { hasToken, tokenRef } = useContext(InitialAuthContext)
  const { data: session, isPending, error } = authClient.useSession()
  const sessionId = session?.session.id
  // A network error keeps the last session; only a 401 or an empty answer
  // means the user is signed out and the SSR token no longer counts.
  const signedOut = !isPending && !session && (!error || error.status === 401)

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      // The SSR token saves a round trip on first connect only; reusing it
      // later would hand Convex an expired token after a long suspension.
      const initialToken = tokenRef.current
      tokenRef.current = null
      if (initialToken && !forceRefreshToken) return initialToken
      return await fetchConvexToken()
    },
    // A new fetcher makes Convex re-authenticate when the user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, tokenRef],
  )

  return {
    isLoading: isPending && !hasToken,
    isAuthenticated: Boolean(sessionId) || (hasToken && !signedOut),
    fetchAccessToken,
  }
}

/**
 * Replaces `ConvexBetterAuthProvider`, whose token fetcher turns any failed
 * request into a permanent sign-out and keeps reusing the SSR token.
 */
export function ConvexAuthProvider({
  client,
  initialToken,
  children,
}: {
  client: ConvexReactClient
  initialToken?: string | null
  children: ReactNode
}) {
  // Route context refreshes the token on every navigation; only the first
  // one, from SSR, is useful here.
  const [hasToken] = useState(Boolean(initialToken))
  const tokenRef = useRef(initialToken ?? null)

  return (
    <InitialAuthContext value={{ hasToken, tokenRef }}>
      <ConvexProviderWithAuth client={client} useAuth={useAuthFromBetterAuth}>
        {children}
      </ConvexProviderWithAuth>
    </InitialAuthContext>
  )
}
