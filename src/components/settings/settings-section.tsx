import { useId } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

import type { ReactNode } from 'react'

/** The titled island card every settings section sits in. */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId}>
      <Card variant="island" className="gap-4 rounded-3xl p-4 sm:gap-5 sm:p-6">
        <CardHeader className="p-0">
          <CardTitle
            id={titleId}
            role="heading"
            aria-level={2}
            className="text-xl"
          >
            {title}
          </CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </CardHeader>
        {children ? (
          <CardContent className="p-0">{children}</CardContent>
        ) : null}
      </Card>
    </section>
  )
}
