import { Suspense } from "react";
import {
  LoansOverview,
  LoansOverviewSkeleton,
} from "./_components/loans-overview";
import { LoanManagement } from "./_components/loan-management.client";

export default function LoansPage() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
      <Suspense fallback={<LoansOverviewSkeleton />}>
        <LoansOverview />
      </Suspense>

      <LoanManagement />
    </div>
  );
}
