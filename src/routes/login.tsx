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

function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
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
        setPending(false)
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
      setPending(false)
    }
  }

  function toggleMode() {
    setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))
    setError(null)
  }

  const isSignIn = mode === 'sign-in'

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

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
              <Button type="submit" className="w-full" disabled={pending}>
                {isSignIn
                  ? pending
                    ? 'Signing in…'
                    : 'Sign in'
                  : pending
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
