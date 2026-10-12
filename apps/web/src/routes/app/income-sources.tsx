import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/income-sources')({
  beforeLoad: () => {
    throw redirect({
      to: '/app',
      search: { task: 'income-sources' },
    })
  },
})
