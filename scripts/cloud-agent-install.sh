#!/usr/bin/env bash
#
# Cloud Agent install: prepare the Misi dev environment.
#
# Idempotent bootstrap that installs dependencies and provisions a local,
# account-free Convex deployment (CONVEX_AGENT_MODE=anonymous) so the app can
# run end-to-end without any Convex Cloud credentials. Long-running dev servers
# are started separately via the `terminals` entries in .cursor/environment.json.
set -euo pipefail

cd "$(dirname "$0")/.."

# Anonymous mode lets the Convex CLI run a local backend without a login.
export CONVEX_AGENT_MODE=anonymous

# 1. Install JS dependencies from the committed lockfile.
pnpm install --frozen-lockfile

# 2. Ensure the web app / Convex CLI env file exists (git-ignored).
if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi

# 3. Configure a local anonymous Convex deployment if one is not configured yet.
#    This writes CONVEX_DEPLOYMENT / VITE_CONVEX_URL / VITE_CONVEX_SITE_URL to
#    .env.local. It is a no-op once a deployment is already configured.
current_deployment="$(sed -n 's/^CONVEX_DEPLOYMENT=//p' .env.local | tr -d '[:space:]')"
if [ -z "$current_deployment" ]; then
  pnpm exec convex init
fi

# 4. Set the Better Auth deployment env vars the Convex functions require.
#    SITE_URL is the public origin the dev server is served from.
pnpm exec convex env set SITE_URL http://localhost:3000

# Generate BETTER_AUTH_SECRET once and keep it stable across reruns.
if [ -z "$(pnpm exec convex env get BETTER_AUTH_SECRET 2>/dev/null || true)" ]; then
  pnpm exec convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
fi

# 5. Push the Convex functions and regenerate types. `--once` exits when done
#    and does not leave the local backend running (the `convex` terminal owns
#    the long-running backend).
pnpm exec convex dev --once

echo "Misi dev environment ready."
