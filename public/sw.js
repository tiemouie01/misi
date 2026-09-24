// Lets Misi start offline. Vite's content-hashed build assets and Google Fonts
// are cached for good; pages come from the network, falling back to the last
// copy seen. Auth and Convex traffic always go to the network.
const ASSET_CACHE = 'misi-assets-v1'
// Must match the page cache cleared on sign-out in persist.ts.
const PAGE_CACHE = 'misi-pages-v1'
const START_URL = '/app'
// A phone can report a connection that moves no data. Past this, a launch
// shows the cached page rather than a blank screen.
const NETWORK_TIMEOUT_MS = 4000
const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com'])

self.addEventListener('install', (event) => {
  // The page that registers this worker loaded before it could cache it.
  event.waitUntil(
    updatePage(new Request(START_URL, { redirect: 'manual' }), (p) =>
      event.waitUntil(p),
    )
      .catch(() => {})
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== ASSET_CACHE && k !== PAGE_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  if (request.mode === 'navigate') {
    if (sameOrigin && !url.pathname.startsWith('/api/')) {
      event.respondWith(handleNavigation(event))
    }
    return
  }
  if (
    (sameOrigin && url.pathname.startsWith('/assets/')) ||
    FONT_HOSTS.has(url.hostname)
  ) {
    event.respondWith(cacheFirst(request))
  }
})

/** Fetches a page and records it: kept if it loaded, dropped if it now
 * redirects (e.g. to sign-in), so a stale copy isn't shown offline. */
async function updatePage(request, waitUntil) {
  const response = await fetch(request)
  if (response.ok) {
    const copy = response.clone()
    waitUntil(caches.open(PAGE_CACHE).then((c) => c.put(request, copy)))
  } else if (response.type === 'opaqueredirect') {
    waitUntil(caches.open(PAGE_CACHE).then((c) => c.delete(request)))
  }
  return response
}

async function handleNavigation(event) {
  const network = updatePage(event.request, (p) => event.waitUntil(p))
  event.waitUntil(network.catch(() => {}))
  const cache = await caches.open(PAGE_CACHE)
  const cached = await cache.match(event.request)
  try {
    return await (cached ? Promise.race([network, timeout()]) : network)
  } catch {
    if (cached) return cached
    // A page never opened online can't render offline; start from home.
    if (await cache.match(START_URL)) return Response.redirect(START_URL)
    return Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  // The font stylesheet loads without CORS, and an opaque answer can't be
  // checked before caching, so ask for a CORS one; Google allows it.
  const response = await fetch(
    FONT_HOSTS.has(new URL(request.url).hostname)
      ? new Request(request.url, { mode: 'cors', credentials: 'omit' })
      : request,
  )
  if (response.ok) cache.put(request, response.clone())
  return response
}

function timeout() {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS),
  )
}
