import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useState } from 'react'

import { MisiMark } from '#/components/misi-mark'
import { ThemeToggle } from '#/components/theme-toggle'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { authClient } from '#/lib/auth-client'

import type { FormEvent } from 'react'

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
            (mode === 'sign-in' ? 'Sign-in failed' : 'Sign-up failed'),
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
        caughtError instanceof Error
          ? caughtError.message
          : mode === 'sign-in'
            ? 'Sign-in failed'
            : 'Sign-up failed',
      )
      setPending(null)
    }
  }

  async function handleGoogleSignIn() {
    setPending('google')
    setError(null)

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/app',
      })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Google sign-in failed',
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
    <div className="flex min-h-screen flex-col">
      <div className="page-wrap flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-lagoon-deep to-palm text-(--btn-text) shadow-md">
            <MisiMark className="size-5" />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-sea-ink">
            Misi
          </span>
        </Link>
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card
          variant="island"
          className="w-full max-w-sm rounded-3xl p-6 sm:p-8"
        >
          <div>
            <p className="island-kicker">Misi</p>
            <h1 className="font-display mt-2 text-2xl font-bold tracking-tight text-sea-ink">
              {isSignIn ? 'Sign in' : 'Create your account'}
            </h1>
            <p className="mt-1 text-[0.9rem] text-sea-ink-soft">
              {isSignIn
                ? 'Your money, flowing in one place.'
                : 'Start tracking in under a minute.'}
            </p>

            <div className="mt-6 space-y-4">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={isBusy}
                onClick={() => void handleGoogleSignIn()}
              >
                <GoogleIcon className="size-4" />
                {pending === 'google'
                  ? 'Redirecting…'
                  : 'Continue with Google'}
              </Button>

              <div className="flex items-center gap-3 text-[0.75rem] font-semibold tracking-wide text-sea-ink-soft uppercase">
                <span className="h-px flex-1 bg-(--chip-line)" />
                or
                <span className="h-px flex-1 bg-(--chip-line)" />
              </div>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              {!isSignIn && (
                <div>
                  <label className="field-label" htmlFor="login-name">
                    Name
                  </label>
                  <Input
                    id="login-name"
                    className="mt-2"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
              )}
              <div>
                <label className="field-label" htmlFor="login-email">
                  Email
                </label>
                <Input
                  id="login-email"
                  className="mt-2"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="login-password">
                  Password
                </label>
                <Input
                  id="login-password"
                  className="mt-2"
                  type="password"
                  minLength={8}
                  autoComplete={isSignIn ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {error && (
                <p
                  className="text-[0.85rem] font-semibold"
                  style={{ color: 'var(--coral)' }}
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={isBusy}
              >
                {isSignIn
                  ? pending === 'email'
                    ? 'Signing in…'
                    : 'Sign in'
                  : pending === 'email'
                    ? 'Creating…'
                    : 'Create account'}
              </Button>
            </form>

            <p className="mt-5 text-center text-[0.85rem] text-sea-ink-soft">
              {isSignIn ? 'New to Misi? ' : 'Already have an account? '}
              <button
                type="button"
                className="font-bold text-lagoon-deep"
                onClick={toggleMode}
              >
                {isSignIn ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          </div>
        </Card>
      </main>
    </div>
  )
}
