import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { createIsomorphicFn, createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'
import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'
import { authClient } from '#/lib/auth-client'
import { ConvexAuthProvider } from '#/lib/convex-auth'
import { getToken } from '#/lib/auth-server'

import type { ConvexQueryClient } from '@convex-dev/react-query'
import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient
}

/** Keep font discovery in the document head so it can start alongside the
 * stylesheet instead of waiting for CSS parsing on mobile connections. */
const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap'

const getAuth = createServerFn({ method: 'GET' }).handler(
  async () => (await getToken()) ?? null,
)

/** The latest auth answer the client has seen, starting with SSR's. */
let lastKnownAuth = false

/**
 * SSR asks the server. Client navigations trust the Better Auth session the
 * page already holds, so a navigation as a phone resumes needs no network.
 * Without one, e.g. right after sign-in, they ask the server, and fall back
 * to the last answer if it can't be reached.
 */
const loadAuth = createIsomorphicFn()
  .server(async () => {
    const token = await getAuth()
    return { isAuthenticated: !!token, token }
  })
  .client(async () => {
    // The store is typed loosely; it holds what `useSession()` returns.
    const session: ReturnType<typeof authClient.useSession> =
      authClient.$store.atoms.session.get()
    if (session.data) {
      return { isAuthenticated: true, token: null }
    }
    try {
      const token = await getAuth()
      return { isAuthenticated: !!token, token }
    } catch {
      return { isAuthenticated: lastKnownAuth, token: null }
    }
  })

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async (ctx) => {
    const auth = await loadAuth()
    if (auth.token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(auth.token)
    }
    return auth
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        name: 'theme-color',
        media: '(prefers-color-scheme: light)',
        content: '#fbfff8',
      },
      {
        name: 'theme-color',
        media: '(prefers-color-scheme: dark)',
        content: '#0a1418',
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'Misi',
      },
      {
        title: 'Misi — Money that flows',
      },
    ],
    links: [
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: FONT_CSS_URL,
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
        sizes: '48x48',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.webmanifest',
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  const context = Route.useRouteContext()

  useEffect(() => {
    lastKnownAuth = context.isAuthenticated
  }, [context.isAuthenticated])

  return (
    <ConvexAuthProvider
      client={context.convexQueryClient.convexClient}
      initialToken={context.token}
    >
      <TooltipProvider>
        <Outlet />
        <Toaster />
      </TooltipProvider>
    </ConvexAuthProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('misi-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
