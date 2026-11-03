import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import {
  CycleSpendChart,
  paceSentence,
} from '#/components/charts/cycle-spend-chart'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

import type { PaceTone } from '#/components/charts/cycle-spend-chart'
import type { CycleSpend } from '../../../shared/cycle-spend'

/** This cycle's spending chart, opened from the home page's figures. */
export function SpendingSheet({
  open,
  onOpenChange,
  spend,
  plan,
  tone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  spend: CycleSpend
  plan: number
  tone: PaceTone
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent sheet>
        <DialogHeader>
          <DialogTitle>Spending this cycle</DialogTitle>
          <DialogDescription>
            {paceSentence({ spend, plan, closed: false })}
          </DialogDescription>
        </DialogHeader>
        <CycleSpendChart spend={spend} plan={plan} tone={tone} />
        <Link
          to="/app/budget"
          search={{ view: 'trends' }}
          className="inline-flex items-center gap-1.5 justify-self-start text-sm font-bold text-lagoon-deep hover:underline"
        >
          See all trends
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </DialogContent>
    </Dialog>
  )
}
