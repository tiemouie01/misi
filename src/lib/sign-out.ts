import { clearOfflineData } from '#/integrations/tanstack-query/persist'
import { authClient } from '#/lib/auth-client'

/** Signs out, drops this device's offline copy, and reloads on /login. */
export async function signOut() {
  await authClient.signOut()
  await clearOfflineData()
  window.location.href = '/login'
}
