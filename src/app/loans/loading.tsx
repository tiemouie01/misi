import { LoansOverviewSkeleton } from "./_components/loans-overview";
import { BorrowedLoansSkeleton } from "./_components/borrowed-loans";
import { LentLoansSkeleton } from "./_components/lent-loans";

export default function LoansLoading() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
      <LoansOverviewSkeleton />

      {/* Loan Management Header Skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="bg-muted/30 h-7 w-40 animate-pulse rounded"></div>
          <div className="bg-muted/30 h-4 w-56 animate-pulse rounded"></div>
        </div>
        <div className="bg-muted/30 h-10 w-24 animate-pulse rounded"></div>
      </div>

      {/* Loans List Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BorrowedLoansSkeleton />
        <LentLoansSkeleton />
      </div>
    </div>
  );
}
