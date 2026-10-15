import { ConvexError } from 'convex/values'

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

/**
 * Turns a caught error into copy that is safe to show users. Only messages
 * the server deliberately threw as `ConvexError` are shown as-is; anything
 * else (bugs, network failures) gets the fallback.
 */
export function errorMessage(
  error: unknown,
  fallback: string = GENERIC_ERROR_MESSAGE,
) {
  if (error instanceof ConvexError && typeof error.data === 'string') {
    const message = error.data.trim()
    if (message) return message
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return "You're offline. Try again once you're connected."
  }
  return fallback
}
