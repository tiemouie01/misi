import { Suspense } from "react";
import {
  RevenueStreamsOverview,
  RevenueStreamsOverviewSkeleton,
} from "./_components/revenue-streams-overview";
import {
  RevenueStreamsList,
  RevenueStreamsListSkeleton,
} from "./_components/revenue-streams-list";

export default function RevenueStreamsPage() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
      <Suspense fallback={<RevenueStreamsOverviewSkeleton />}>
        <RevenueStreamsOverview />
      </Suspense>

      <Suspense fallback={<RevenueStreamsListSkeleton />}>
        <RevenueStreamsList />
      </Suspense>
    </div>
  );
}
