# PowerSync Cloud + Convex

Misi syncs its local SQLite database through **PowerSync Cloud**, replicating from the **Convex Cloud** deployment.

Convex support in PowerSync is **experimental** and uses ~1s polling latency.

## Prerequisites

- A [PowerSync Cloud](https://powersync.journeyapps.com/) instance
- A Convex Cloud deployment that includes:
  - the `powersync_checkpoints` table
  - the PowerSync sync mutations (`convex/sync.ts`) deployed
- One-time UUID backfill after deploying those Convex changes:

  ```bash
  npx convex run migrations:backfillUuids
  ```

## PowerSync Cloud setup

All service configuration lives in the PowerSync Cloud dashboard — there is nothing to run locally.

1. **Create an instance** (or open your existing one) in the PowerSync dashboard.

2. **Connect Convex as the backend database.** In the instance settings, add a Convex connection:
   - **Deployment URL**: `https://<deployment>.convex.cloud`
   - **Deploy key**: generate one in the Convex dashboard under **Settings → Deploy key**

3. **Configure client auth (JWKS).** PowerSync verifies the Better Auth JWTs the app presents. Point the instance's JWKS URL at the Convex site URL:

   ```text
   https://<deployment>.convex.site/.well-known/jwks.json
   ```

   Verify it resolves:

   ```bash
   curl -sS "https://<deployment>.convex.site/.well-known/jwks.json" | head
   ```

   If that returns 404, try Better Auth's default JWKS route instead:

   ```text
   https://<deployment>.convex.site/api/auth/jwks
   ```

   Set the JWT audience to `convex`.

4. **Deploy the sync rules.** Copy the contents of [`sync-config.yaml`](./sync-config.yaml) into the instance's sync rules editor and deploy.

5. **Point the app at the instance.** Copy the instance URL (looks like `https://<instance-id>.powersync.journeyapps.com`) into `.env.local`:

   ```bash
   VITE_POWERSYNC_URL=https://<instance-id>.powersync.journeyapps.com
   ```

## Verify

1. In the PowerSync dashboard, the instance should show a healthy Convex connection and deployed sync rules.
2. Sign in to the app; the browser devtools network tab should show a WebSocket/HTTP stream to the instance URL, and local writes should appear in Convex within a few seconds.

## Layout

```text
powersync/
├── sync-config.yaml   # Sync Streams (user_data) — paste into the Cloud dashboard
└── README.md
```

## Notes

- Auth: clients present a Better Auth JWT; PowerSync Cloud verifies it via the JWKS URL with audience `convex`.
- Sync rules filter each table with `userId = auth.user_id()`. If the JWT subject includes a Convex Auth-style `userid|sessionid` suffix, update `sync-config.yaml` to use `substring(auth.user_id(), 1, 32)` instead (see comments in that file).
