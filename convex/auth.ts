import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth/minimal'

import { requireHttpUrl } from '../shared/http-url'
import authConfig from './auth.config'
import { components } from './_generated/api'
import { query } from './_generated/server'

import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'

function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()

  if (!clientId && !clientSecret) return undefined

  if (!clientId || !clientSecret) {
    throw new Error(
      '[auth] Google OAuth is partially configured. Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the Convex deployment, or unset both.',
    )
  }

  return { clientId, clientSecret }
}

const siteUrl = requireHttpUrl({
  name: 'SITE_URL',
  value: process.env.SITE_URL,
  missingHint:
    'Set it on the Convex deployment with `npx convex env set SITE_URL https://your-app.example.com`.',
})
const googleCredentials = getGoogleCredentials()

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
    },
    ...(googleCredentials
      ? {
          socialProviders: {
            google: {
              clientId: googleCredentials.clientId,
              clientSecret: googleCredentials.clientSecret,
              prompt: 'select_account',
            },
          },
        }
      : {}),
    account: {
      accountLinking: {
        enabled: true,
        ...(googleCredentials ? { trustedProviders: ['google'] } : {}),
      },
    },
    plugins: [convex({ authConfig })],
  })
}

export async function requireAuthUser(ctx: GenericCtx<DataModel>) {
  return await authComponent.getAuthUser(ctx)
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx)
  },
})
