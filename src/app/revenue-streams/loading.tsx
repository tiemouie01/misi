import { RevenueStreamsOverviewSkeleton } from "./_components/revenue-streams-overview";
import { RevenueStreamsListSkeleton } from "./_components/revenue-streams-list";

export default function RevenueStreamsLoading() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
      <RevenueStreamsOverviewSkeleton />
      <RevenueStreamsListSkeleton />
    </div>
  );
}
