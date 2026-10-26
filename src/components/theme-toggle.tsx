import { Monitor, Moon, Sun } from 'lucide-react'

import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { setThemePreference, useThemePreference } from '#/lib/use-theme'
import { cn } from '#/lib/utils'

import type { LucideIcon } from 'lucide-react'
import type { ThemePreference } from '#/lib/use-theme'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const satisfies ReadonlyArray<{
  value: ThemePreference
  label: string
  icon: LucideIcon
}>

function isThemePreference(value: string): value is ThemePreference {
  return THEME_OPTIONS.some((option) => option.value === value)
}

/**
 * Light / System / Dark segmented control. `compact` hides the labels
 * visually (they stay readable to screen readers) for tight page headers.
 */
export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  const preference = useThemePreference()

  return (
    <ToggleGroup
      type="single"
      aria-label="Theme"
      size={compact ? 'sm' : 'default'}
      value={preference}
      onValueChange={(value) => {
        // Radix clears the value when the selected item is pressed again.
        if (isThemePreference(value)) setThemePreference(value)
      }}
      className={className}
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          title={compact ? label : undefined}
          className={cn(!compact && 'flex-1')}
        >
          <Icon />
          <span className={cn(compact && 'sr-only')}>{label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
