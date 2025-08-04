import { OverviewCardsSkeleton } from "./_components/overview-cards";
import { QuickActionsSkeleton } from "./_components/quick-actions";
import { RevenueStreamsSummarySkeleton } from "./_components/revenue-streams-summary";
import { RecentTransactionsSkeleton } from "./_components/recent-transactions";
import { LoanSummarySkeleton } from "./_components/loan-summary";

export default function DashboardLoading() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
      <OverviewCardsSkeleton />
      <QuickActionsSkeleton />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueStreamsSummarySkeleton />
        <RecentTransactionsSkeleton />
      </div>

      <LoanSummarySkeleton />
    </div>
  );
}
