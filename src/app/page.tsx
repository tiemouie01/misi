import { Suspense } from "react";
import {
  OverviewCards,
  OverviewCardsSkeleton,
} from "./_components/overview-cards";
import {
  QuickActions,
  QuickActionsSkeleton,
} from "./_components/quick-actions";
import {
  RevenueStreamsSummary,
  RevenueStreamsSummarySkeleton,
} from "./_components/revenue-streams-summary";
import {
  RecentTransactions,
  RecentTransactionsSkeleton,
} from "./_components/recent-transactions";
import { LoanSummary, LoanSummarySkeleton } from "./_components/loan-summary";

export default function DashboardPage() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
      <Suspense fallback={<OverviewCardsSkeleton />}>
        <OverviewCards />
      </Suspense>

      <Suspense fallback={<QuickActionsSkeleton />}>
        <QuickActions />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<RevenueStreamsSummarySkeleton />}>
          <RevenueStreamsSummary />
        </Suspense>

        <Suspense fallback={<RecentTransactionsSkeleton />}>
          <RecentTransactions />
        </Suspense>
      </div>

      <Suspense fallback={<LoanSummarySkeleton />}>
        <LoanSummary />
      </Suspense>
    </div>
  );
}
