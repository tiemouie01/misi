import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { ArrowRight } from "lucide-react";
import { calculateRevenueStreams } from "~/server/db/queries";

export async function RevenueStreamsSummary() {
  // TODO: Replace with actual user ID from authentication
  const userId = "cmdr1xnpujgm4ta";

  const { data: revenueStreams, error } = await calculateRevenueStreams(userId);

  if (error) {
    return (
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-lg">Revenue Streams</CardTitle>
          <CardDescription>Error loading revenue streams</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const streams = revenueStreams ?? [];

  return (
    <Card className="glass-card border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Revenue Streams</CardTitle>
          <CardDescription>Income allocation overview</CardDescription>
        </div>
        <Link href="/revenue-streams">
          <Button variant="ghost" size="sm" className="glass">
            View All <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {streams.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-2">No revenue streams yet</p>
            <p className="text-muted-foreground text-sm">
              Add income transactions to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {streams.slice(0, 3).map((stream) => (
              <div key={stream.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full ${stream.color}`} />
                    <span className="font-medium">{stream.name}</span>
                  </div>
                  <span
                    className={`text-sm font-semibold ${stream.remaining >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    ${stream.remaining.toFixed(2)}
                  </span>
                </div>
                <Progress
                  value={
                    stream.totalIncome > 0
                      ? (stream.allocatedExpenses / stream.totalIncome) * 100
                      : 0
                  }
                  className="h-2"
                />
              </div>
            ))}
            {streams.length > 3 && (
              <p className="text-muted-foreground pt-2 text-center text-sm">
                +{streams.length - 3} more streams
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton component for loading state
export function RevenueStreamsSummarySkeleton() {
  return (
    <Card className="glass-card border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-2">
          <div className="bg-muted/30 h-5 w-32 animate-pulse rounded"></div>
          <div className="bg-muted/30 h-4 w-40 animate-pulse rounded"></div>
        </div>
        <div className="bg-muted/30 h-8 w-20 animate-pulse rounded"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-muted/30 h-3 w-3 animate-pulse rounded-full"></div>
                  <div className="bg-muted/30 h-4 w-24 animate-pulse rounded"></div>
                </div>
                <div className="bg-muted/30 h-4 w-16 animate-pulse rounded"></div>
              </div>
              <div className="bg-muted/30 h-2 animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
