/** "Good morning, Timothy." — `now` is null before hydration (SSR) to avoid a clock mismatch. */
export function greeting(now: Date | null, name?: string | null) {
  const hour = now?.getHours() ?? 9
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const first = name?.trim().split(/\s+/)[0]
  return first ? `Good ${part}, ${first}.` : `Good ${part}.`
}
