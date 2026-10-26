import { Palette } from 'lucide-react'

import { SettingsSection } from '#/components/settings/settings-section'
import { ThemeToggle } from '#/components/theme-toggle'

export function AppearanceSection() {
  return (
    <SettingsSection
      title="Appearance"
      icon={Palette}
      description="System follows your device's light or dark setting."
    >
      <ThemeToggle className="w-full sm:w-fit" />
    </SettingsSection>
  )
}
