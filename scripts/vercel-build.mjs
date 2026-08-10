#!/usr/bin/env node

/**
 * Vercel build: deploy Convex with CONVEX_DEPLOY_KEY, then build the app.
 * CONVEX_DEPLOYMENT must not be set in CI — it forces user-token auth and fails.
 */

const deployKey = process.env.CONVEX_DEPLOY_KEY?.trim()

if (!deployKey) {
  console.error(`
Missing CONVEX_DEPLOY_KEY.

In the Convex dashboard, open your production deployment → Settings →
Generate Production Deploy Key, then add it in Vercel as:

  CONVEX_DEPLOY_KEY=<paste the full key, usually starts with prod: or preview:>

Do not put that value in CONVEX_DEPLOYMENT. Remove CONVEX_DEPLOYMENT from
Vercel env vars if it is set.
`)
  process.exit(1)
}

if (
  !deployKey.startsWith('prod:') &&
  !deployKey.startsWith('preview:') &&
  !deployKey.startsWith('dev:')
) {
  console.error(`
CONVEX_DEPLOY_KEY looks invalid.

Expected a deploy key like:
  prod:knowing-shrimp-222|eyJ...
  preview:team:project|eyJ...

Got a value that does not start with prod:, preview:, or dev:.
If you pasted the key into CONVEX_DEPLOYMENT instead, move it to CONVEX_DEPLOY_KEY.
`)
  process.exit(1)
}

// Local/dev selection must not override deploy-key auth on Vercel.
delete process.env.CONVEX_DEPLOYMENT

const { spawnSync } = await import('node:child_process')

const result = spawnSync(
  'pnpm',
  [
    'exec',
    'convex',
    'deploy',
    '--cmd-url-env-var-name',
    'VITE_CONVEX_URL',
    '--cmd',
    'pnpm run build',
  ],
  {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  },
)

process.exit(result.status ?? 1)
