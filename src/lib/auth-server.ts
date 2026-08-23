import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'

import { requireHttpUrl } from '../../shared/http-url'

const buildEnv = {
  VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
  VITE_CONVEX_SITE_URL: import.meta.env.VITE_CONVEX_SITE_URL,
} as const

const START_ENV_HINT =
  'Set it in the TanStack Start environment before starting the app.'

function getConfiguredValue(name: keyof typeof buildEnv): string | undefined {
  return process.env[name]?.trim() || buildEnv[name]?.trim()
}

function deriveConvexSiteUrl(convexUrl: string): string {
  const url = new URL(convexUrl)

  if (!url.hostname.endsWith('.convex.cloud')) {
    throw new Error(
      '[auth] VITE_CONVEX_SITE_URL is required when VITE_CONVEX_URL is not a *.convex.cloud URL. Set it to the matching *.convex.site deployment URL.',
    )
  }

  url.hostname = url.hostname.replace(/\.convex\.cloud$/, '.convex.site')
  return url.toString().replace(/\/+$/, '')
}

function getConvexSiteUrl(convexUrl: string): string {
  const configuredSiteUrl = getConfiguredValue('VITE_CONVEX_SITE_URL')
  if (!configuredSiteUrl) return deriveConvexSiteUrl(convexUrl)

  const siteUrl = requireHttpUrl({
    name: 'VITE_CONVEX_SITE_URL',
    value: configuredSiteUrl,
    missingHint: START_ENV_HINT,
  })
  if (new URL(siteUrl).hostname.endsWith('.convex.cloud')) {
    throw new Error(
      `[auth] VITE_CONVEX_SITE_URL must be the Convex Site URL ending in .convex.site, not the deployment URL ${siteUrl}.`,
    )
  }

  return siteUrl
}

const convexUrl = requireHttpUrl({
  name: 'VITE_CONVEX_URL',
  value: getConfiguredValue('VITE_CONVEX_URL'),
  missingHint: START_ENV_HINT,
})
const convexSiteUrl = getConvexSiteUrl(convexUrl)

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexUrl,
  convexSiteUrl,
})
