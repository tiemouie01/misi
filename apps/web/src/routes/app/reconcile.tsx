import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/reconcile')({
  beforeLoad: () => {
    throw redirect({
      to: '/app',
      search: { task: 'reconcile' },
    })
  },
})
