import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/app/debts')({
  component: DebtsLayout,
})

function DebtsLayout() {
  return <Outlet />
}
