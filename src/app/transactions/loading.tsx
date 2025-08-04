import { TransactionsListSkeleton } from "./_components/transactions-list";
import { TemplatesListSkeleton } from "./_components/templates-list";
import { CategoriesListSkeleton } from "./_components/categories-list";

export default function TransactionsLoading() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
      {/* Tab Navigation Skeleton */}
      <div className="frosted mb-6 rounded-xl p-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/30 h-10 animate-pulse rounded"></div>
          <div className="bg-muted/30 h-10 animate-pulse rounded"></div>
          <div className="bg-muted/30 h-10 animate-pulse rounded"></div>
        </div>
      </div>

      {/* Content Header Skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="bg-muted/30 h-7 w-48 animate-pulse rounded"></div>
          <div className="bg-muted/30 h-4 w-64 animate-pulse rounded"></div>
        </div>
        <div className="bg-muted/30 h-10 w-36 animate-pulse rounded"></div>
      </div>

      {/* Default to transactions list skeleton */}
      <TransactionsListSkeleton />
    </div>
  );
}
