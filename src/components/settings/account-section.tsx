import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { SettingsSection } from '#/components/settings/settings-section'
import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'
import { errorMessage } from '#/lib/error-message'
import { signOut } from '#/lib/sign-out'

export function AccountSection() {
  const { data: session, isPending } = authClient.useSession()
  const [signingOut, setSigningOut] = useState(false)
  const user = session?.user

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
    } catch (caught) {
      setSigningOut(false)
      toast.error(errorMessage(caught, 'Unable to sign out'))
    }
  }

  return (
    <SettingsSection title="Account">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {isPending && !user ? (
            <p className="text-sm text-sea-ink-soft">Loading…</p>
          ) : (
            <>
              <p className="truncate font-bold text-sea-ink">
                {user?.name || 'Signed in'}
              </p>
              {user?.email ? (
                <p className="truncate text-sm text-sea-ink-soft">
                  {user.email}
                </p>
              ) : null}
            </>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
          className="w-full sm:w-auto"
        >
          <LogOut />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </SettingsSection>
  )
}
