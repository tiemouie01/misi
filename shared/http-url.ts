/**
 * Validates that an environment value is an absolute http(s) URL and returns
 * it without a trailing slash. `missingHint` tells the operator where to set
 * the variable, which differs between the Convex deployment and the app.
 */
export function requireHttpUrl(options: {
  name: string
  value: string | undefined
  missingHint: string
}): string {
  const value = options.value?.trim()

  if (!value) {
    throw new Error(
      `[auth] Missing required environment variable ${options.name}. ${options.missingHint}`,
    )
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(
      `[auth] Environment variable ${options.name} must be a valid HTTP(S) URL. Received: ${value}`,
    )
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `[auth] Environment variable ${options.name} must use http:// or https://. Received: ${value}`,
    )
  }

  return url.toString().replace(/\/+$/, '')
}
