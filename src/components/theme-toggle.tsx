import { Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { Button } from '#/components/ui/button'

const themeChangeEvent = 'misi-theme-change'

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

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  )

  function toggleTheme() {
    const nextIsDark = !isDark
    document.documentElement.classList.toggle('dark', nextIsDark)
    localStorage.setItem('misi-theme', nextIsDark ? 'dark' : 'light')
    window.dispatchEvent(new Event(themeChangeEvent))
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-sm"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="size-9"
      onClick={toggleTheme}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
