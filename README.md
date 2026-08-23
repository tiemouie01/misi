# Misi

Misi is a cycle-based personal finance app built with TanStack Start, Convex,
and Better Auth.

## Development

To run this application:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Production builds

Build and run the Nitro server locally with:

```bash
pnpm build
node .output/server/index.mjs
```

The production artifact is `.output/server/index.mjs`, not `dist/server`.
The public Convex URL is baked into the server bundle during the build, while
runtime values may still override it when explicitly configured.

## Convex development

Set `VITE_CONVEX_URL` in `.env.local` to the public `*.convex.cloud` URL for
the Convex deployment you are using. `VITE_CONVEX_SITE_URL` is optional when
that URL follows Convex's standard `*.convex.cloud`/`*.convex.site` naming.

For local Convex development, set `CONVEX_DEPLOYMENT` to the deployment
selected by `pnpm dlx convex dev` and run:

```bash
pnpm dlx convex dev
```

`CONVEX_DEPLOYMENT` is a local development setting. Do not use it as the
Vercel deploy credential.

## Authentication configuration

Authentication is hosted by the Convex Better Auth component. Set these
variables on the Convex deployment, not only in the web app's `.env.local`:

```bash
pnpm dlx convex env set SITE_URL http://localhost:3000
pnpm dlx convex env set BETTER_AUTH_SECRET '<a long random secret>'
```

`SITE_URL` must be the public origin where Misi is served. For production,
set it to the production HTTPS origin. Generate a different secret for each
deployment and keep it out of source control.

Google sign-in is optional. Configure both variables together, or leave both
unset:

```bash
pnpm dlx convex env set GOOGLE_CLIENT_ID '<client id>'
pnpm dlx convex env set GOOGLE_CLIENT_SECRET '<client secret>'
```

The Google OAuth redirect URI is
`<SITE_URL>/api/auth/callback/google`. Set `VITE_GOOGLE_AUTH_ENABLED=true` in
the web app only after both Google credentials are present on Convex.

## PostHog (optional)

Set `VITE_POSTHOG_KEY` in `.env.local` to enable analytics. The default host is
`https://us.i.posthog.com`; set `VITE_POSTHOG_HOST` for another PostHog Cloud
region or a self-hosted instance.

## Vercel deployment

`vercel.json` uses `pnpm run vercel-build`. That script deploys the Convex
functions and then builds the app, so configure a Convex deploy key in Vercel:

```text
CONVEX_DEPLOY_KEY=prod:...    # production
CONVEX_DEPLOY_KEY=preview:... # preview
```

The key must start with `prod:` or `preview:`. Development keys are rejected.
Do not set `CONVEX_DEPLOYMENT` in Vercel; it selects user-token auth and is not
the CI credential used by the build script. Configure Convex deployment
variables such as `SITE_URL`, `BETTER_AUTH_SECRET`, and the optional Google
credentials through the Convex dashboard or `convex env set`.

## Verification

Run the full local checks before shipping:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm check
pnpm build
```

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from '@tanstack/react-router'
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')

  useEffect(() => {
    getServerTime().then(setTime)
  }, [])

  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
