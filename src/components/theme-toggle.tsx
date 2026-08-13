import { Moon, Sun } from 'lucide-react'

import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { themeChangeEvent, useIsDarkTheme } from '#/lib/use-theme'

export function ThemeToggle() {
  const isDark = useIsDarkTheme()

  function toggleTheme() {
    const nextIsDark = !isDark
    document.documentElement.classList.toggle('dark', nextIsDark)
    localStorage.setItem('misi-theme', nextIsDark ? 'dark' : 'light')
    window.dispatchEvent(new Event(themeChangeEvent))
  }

  const label = `Switch to ${isDark ? 'light' : 'dark'} mode`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          aria-label={label}
          className="size-9"
          onClick={toggleTheme}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
