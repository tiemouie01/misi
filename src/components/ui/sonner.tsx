import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Toaster as Sonner } from 'sonner'

import { useIsDarkTheme } from '#/lib/use-theme'

import type { CSSProperties } from 'react'
import type { ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const isDark = useIsDarkTheme()

  return (
    <Sonner
      theme={isDark ? 'dark' : 'light'}
      position="bottom-right"
      closeButton
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--surface-strong)',
          '--normal-text': 'var(--sea-ink)',
          '--normal-border': 'var(--line)',
          '--success-bg': 'var(--surface-strong)',
          '--success-text': 'var(--sea-ink)',
          '--success-border': 'var(--line)',
          '--error-bg':
            'color-mix(in oklab, var(--coral) 10%, var(--surface-strong))',
          '--error-text': 'var(--coral-deep)',
          '--error-border': 'color-mix(in oklab, var(--coral) 25%, transparent)',
          '--border-radius': '1rem',
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            'rounded-2xl border border-(--line) bg-(--surface-strong) text-sea-ink shadow-lg backdrop-blur-md',
          title: 'text-sm font-semibold text-sea-ink',
          description: 'text-sm text-sea-ink-soft',
          success: 'text-sea-ink',
          error: 'border-coral/25 bg-coral/8 text-coral-deep',
          icon: 'text-lagoon-deep group-data-[type=error]:text-coral-deep',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
