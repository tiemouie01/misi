import { OverviewCardsGrid } from "~/components/overview-cards";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import {
  initializeData,
  calculateRevenueStreams,
  calculateTotals,
} from "~/lib/financial-utils";

export function RevenueStreamsOverview() {
  const data = initializeData();
  const revenueStreams = calculateRevenueStreams(
    data.transactions,
    data.categories,
  );
  const { totalIncome, totalExpenses, totalRemaining } =
    calculateTotals(revenueStreams);

  const overviewCards = [
    {
      title: "Total Revenue",
      value: `$${totalIncome.toFixed(2)}`,
      description: "Flowing income streams",
      icon: TrendingUp,
      iconColor: "bg-emerald-400/20",
      valueColor: "text-emerald-400",
    },
    {
      title: "Allocated Expenses",
      value: `$${totalExpenses.toFixed(2)}`,
      description: "Distributed costs",
      icon: TrendingDown,
      iconColor: "bg-rose-400/20",
      valueColor: "text-rose-400",
    },
    {
      title: "Total Remaining",
      value: `$${totalRemaining.toFixed(2)}`,
      description: "Available liquidity",
      icon: DollarSign,
      iconColor: "bg-cyan-400/20",
      valueColor: totalRemaining >= 0 ? "text-cyan-400" : "text-rose-400",
    },
    {
      title: "Revenue Streams",
      value: revenueStreams.length.toString(),
      description: "Active sources",
      icon: Target,
      iconColor: "bg-indigo-400/20",
      valueColor: "text-indigo-400",
    },
  ];

  return <OverviewCardsGrid cards={overviewCards} />;
}

// Skeleton component for loading state
export function RevenueStreamsOverviewSkeleton() {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl border-0 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="bg-muted/30 h-4 w-24 animate-pulse rounded"></div>
              <div className="bg-muted/30 h-8 w-20 animate-pulse rounded"></div>
              <div className="bg-muted/30 h-3 w-32 animate-pulse rounded"></div>
            </div>
            <div className="bg-muted/30 h-12 w-12 animate-pulse rounded-xl"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
