import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'

import { BrandMark } from '#/components/misi-mark'
import { ThemeToggle } from '#/components/theme-toggle'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { authClient } from '#/lib/auth-client'
import { errorMessage } from '#/lib/error-message'
import { WaterWaves } from '#/components/water'

import type { FormEvent } from 'react'

const googleAuthEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'

/** Taller fields with larger text, easier to tap and read. */
const inputClassName = 'mt-2 h-12 text-base sm:text-base'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.isAuthenticated) throw redirect({ to: '/app' })
  },
  component: LoginPage,
})

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState<'email' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending('email')
    setError(null)

    const callbacks = {
      onSuccess: () => {
        void navigate({ to: '/app' })
      },
      onError: (ctx: { error: { message?: string } }) => {
        setError(
          ctx.error.message ??
            (mode === 'sign-in'
              ? 'Could not sign in. Try again.'
              : 'Could not make your account. Try again.'),
        )
        setPending(null)
      },
    }

    try {
      if (mode === 'sign-in') {
        await authClient.signIn.email({ email, password }, callbacks)
      } else {
        await authClient.signUp.email({ email, password, name }, callbacks)
      }
    } catch (caughtError) {
      setError(
        errorMessage(
          caughtError,
          mode === 'sign-in'
            ? 'Could not sign in. Try again.'
            : 'Could not make your account. Try again.',
        ),
      )
      setPending(null)
    }
  }

  async function handleGoogleSignIn() {
    if (!googleAuthEnabled) return

    setPending('google')
    setError(null)

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/app',
      })
    } catch (caughtError) {
      setError(
        errorMessage(caughtError, 'Could not sign in with Google. Try again.'),
      )
      setPending(null)
    }
  }

  function toggleMode() {
    setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))
    setError(null)
  }

  const isSignIn = mode === 'sign-in'
  const isBusy = pending !== null

  return (
    <div className="app-ground flex flex-col">
      <WaterWaves />
      <header className="page-wrap flex items-center justify-between py-4 sm:py-5">
        <Link
          to="/"
          aria-label="Misi home"
          className="flex items-center gap-2.5 no-underline"
        >
          <BrandMark />
          <span className="font-display text-2xl font-bold tracking-tight text-sea-ink">
            Misi
          </span>
        </Link>
        <ThemeToggle compact />
      </header>

      <main className="page-wrap flex flex-1 flex-col items-center justify-center pt-4 pb-16 sm:pb-24">
        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="font-display text-[2rem] font-bold tracking-tight text-sea-ink sm:text-4xl">
              {isSignIn ? 'Sign in' : 'Make an account'}
            </h1>
            <p className="mt-2 text-base text-sea-ink-soft">
              {isSignIn
                ? 'See all your money in one place.'
                : 'It takes less than a minute.'}
            </p>
          </div>

          <Card variant="panel" className="mt-6 gap-0 p-6 sm:mt-8 sm:p-8">
            {googleAuthEnabled && (
              <div className="mb-5 space-y-5">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  disabled={isBusy}
                  onClick={() => void handleGoogleSignIn()}
                >
                  <GoogleIcon className="size-5" />
                  {pending === 'google'
                    ? 'Opening Google…'
                    : 'Continue with Google'}
                </Button>

                <div className="flex items-center gap-3 text-[0.8rem] font-semibold tracking-wide text-sea-ink-soft uppercase">
                  <span className="h-px flex-1 bg-(--chip-line)" />
                  or
                  <span className="h-px flex-1 bg-(--chip-line)" />
                </div>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              {!isSignIn && (
                <div>
                  <Label htmlFor="login-name">Your name</Label>
                  <Input
                    id="login-name"
                    className={inputClassName}
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
              )}
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  className={inputClassName}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  className={inputClassName}
                  type="password"
                  minLength={8}
                  autoComplete={isSignIn ? 'current-password' : 'new-password'}
                  aria-describedby={
                    isSignIn ? undefined : 'login-password-hint'
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                {!isSignIn && (
                  <p
                    id="login-password-hint"
                    className="mt-1.5 text-[0.85rem] text-sea-ink-soft"
                  >
                    At least 8 letters, numbers or symbols.
                  </p>
                )}
              </div>
              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl border border-coral/25 bg-coral/10 px-3.5 py-3 text-[0.9rem] font-semibold text-coral-deep"
                >
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0"
                    strokeWidth={2.4}
                  />
                  {error}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className="h-13 w-full text-[1.05rem]"
                disabled={isBusy}
              >
                {isSignIn
                  ? pending === 'email'
                    ? 'Signing in…'
                    : 'Sign in'
                  : pending === 'email'
                    ? 'Making your account…'
                    : 'Make account'}
              </Button>
            </form>
          </Card>

          <p className="mt-6 text-center text-base text-sea-ink-soft">
            {isSignIn ? 'New to Misi? ' : 'Have an account? '}
            <Button
              type="button"
              variant="link"
              className="h-auto align-baseline text-base font-bold text-sea-ink underline hover:text-sea-ink"
              onClick={toggleMode}
            >
              {isSignIn ? 'Make an account' : 'Sign in'}
            </Button>
          </p>
        </div>
      </main>
    </div>
  )
}
