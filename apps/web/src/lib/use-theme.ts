import { useSyncExternalStore } from 'react'

export const themeChangeEvent = 'misi-theme-change'

function getThemeSnapshot() {
  return document.documentElement.classList.contains('dark')
}

function getServerThemeSnapshot() {
  return false
}

function subscribeToTheme(onStoreChange: () => void) {
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')

  function applyStoredTheme() {
    const storedTheme = localStorage.getItem('misi-theme')
    const isDark =
      storedTheme === null ? colorScheme.matches : storedTheme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    onStoreChange()
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === 'misi-theme') applyStoredTheme()
  }

  function handleColorSchemeChange() {
    if (localStorage.getItem('misi-theme') === null) applyStoredTheme()
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

export function useIsDarkTheme() {
  return useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  )
}
