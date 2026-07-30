import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleTheme() {
    const nextIsDark = !isDark
    document.documentElement.classList.toggle('dark', nextIsDark)
    localStorage.setItem('misi-theme', nextIsDark ? 'dark' : 'light')
    setIsDark(nextIsDark)
  }

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      className="grid size-9 place-items-center rounded-full border border-(--chip-line) bg-(--chip-bg) text-sea-ink transition hover:border-lagoon-deep"
      onClick={toggleTheme}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
