import { useSyncExternalStore } from 'react'

export const themeChangeEvent = 'misi-theme-change'

/** `system` has no stored value: a missing `misi-theme` key follows the OS. */
export type ThemePreference = 'light' | 'system' | 'dark'

/** Read by the pre-paint script in `__root.tsx`; keep the format in sync. */
const STORAGE_KEY = 'misi-theme'

const colorSchemeQuery = '(prefers-color-scheme: dark)'

function readThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

function applyThemePreference() {
  const preference = readThemePreference()
  const isDark =
    preference === 'system'
      ? window.matchMedia(colorSchemeQuery).matches
      : preference === 'dark'
  document.documentElement.classList.toggle('dark', isDark)
}

export function setThemePreference(preference: ThemePreference) {
  if (preference === 'system') localStorage.removeItem(STORAGE_KEY)
  else localStorage.setItem(STORAGE_KEY, preference)
  applyThemePreference()
  window.dispatchEvent(new Event(themeChangeEvent))
}

function subscribeToTheme(onStoreChange: () => void) {
  const colorScheme = window.matchMedia(colorSchemeQuery)

  function handleStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return
    applyThemePreference()
    onStoreChange()
  }

  function handleColorSchemeChange() {
    if (readThemePreference() !== 'system') return
    applyThemePreference()
    onStoreChange()
  }

  window.addEventListener(themeChangeEvent, onStoreChange)
  window.addEventListener('storage', handleStorage)
  colorScheme.addEventListener('change', handleColorSchemeChange)

  return () => {
    window.removeEventListener(themeChangeEvent, onStoreChange)
    window.removeEventListener('storage', handleStorage)
    colorScheme.removeEventListener('change', handleColorSchemeChange)
  }
}

export function useThemePreference() {
  return useSyncExternalStore(
    subscribeToTheme,
    readThemePreference,
    (): ThemePreference => 'system',
  )
}

export function useIsDarkTheme() {
  return useSyncExternalStore(
    subscribeToTheme,
    () => document.documentElement.classList.contains('dark'),
    () => false,
  )
}
