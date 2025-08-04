import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Droplets } from "lucide-react";
import { initializeData, calculateRevenueStreams } from "~/lib/financial-utils";

export function RevenueStreamsList() {
  const data = initializeData();
  const revenueStreams = calculateRevenueStreams(
    data.transactions,
    data.categories,
  );

  return (
    <Card className="frosted border-0">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 p-2">
            <Droplets className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="gradient-text">
              Revenue Stream Details
            </CardTitle>
            <CardDescription>
              See how expenses flow through your revenue streams
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {revenueStreams.length === 0 ? (
          <div className="py-12 text-center">
            <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full p-4">
              <Droplets className="text-muted-foreground h-8 w-8" />
            </div>
            <p className="text-muted-foreground mb-2">
              No revenue streams yet.
            </p>
            <p className="text-muted-foreground text-sm">
              Add some income transactions to create flowing revenue streams.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {revenueStreams.map((stream) => (
              <div
                key={stream.name}
                className="glass rounded-xl p-6 transition-transform duration-300 hover:scale-[1.02]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`h-4 w-4 rounded-full ${stream.color}`} />
                    <h3 className="text-lg font-semibold">{stream.name}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground text-sm">
                      Remaining
                    </div>
                    <div
                      className={`text-xl font-bold ${stream.remaining >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      ${stream.remaining.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
                    <div className="text-muted-foreground text-sm">
                      Total Income
                    </div>
                    <div className="text-lg font-semibold text-emerald-400">
                      ${stream.totalIncome.toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-center">
                    <div className="text-muted-foreground text-sm">
                      Allocated Expenses
                    </div>
                    <div className="text-lg font-semibold text-rose-400">
                      ${stream.allocatedExpenses.toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-center">
                    <div className="text-muted-foreground text-sm">
                      Utilization
                    </div>
                    <div className="text-lg font-semibold text-cyan-400">
                      {stream.totalIncome > 0
                        ? (
                            (stream.allocatedExpenses / stream.totalIncome) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Allocation Progress
                    </span>
                    <span className="text-muted-foreground">
                      ${stream.allocatedExpenses.toFixed(2)} / $
                      {stream.totalIncome.toFixed(2)}
                    </span>
                  </div>
                  <div className="relative">
                    <Progress
                      value={
                        stream.totalIncome > 0
                          ? (stream.allocatedExpenses / stream.totalIncome) *
                            100
                          : 0
                      }
                      className="bg-muted/30 h-3"
                    />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20"></div>
                  </div>
                </div>

                {stream.expenses.length > 0 && (
                  <div>
                    <h4 className="text-muted-foreground mb-3 font-medium">
                      Allocated Expenses:
                    </h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {stream.expenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="bg-muted/20 border-muted/30 flex items-center justify-between rounded-lg border p-3 text-sm"
                        >
                          <span className="truncate">
                            {expense.description}
                          </span>
                          <span className="ml-2 font-medium text-rose-400">
                            ${expense.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton component for loading state
export function RevenueStreamsListSkeleton() {
  return (
    <Card className="frosted border-0">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="bg-muted/30 h-10 w-10 animate-pulse rounded-lg"></div>
          <div className="space-y-2">
            <div className="bg-muted/30 h-6 w-40 animate-pulse rounded"></div>
            <div className="bg-muted/30 h-4 w-56 animate-pulse rounded"></div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-muted/30 h-4 w-4 animate-pulse rounded-full"></div>
                  <div className="bg-muted/30 h-6 w-32 animate-pulse rounded"></div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="bg-muted/30 h-4 w-16 animate-pulse rounded"></div>
                  <div className="bg-muted/30 h-6 w-20 animate-pulse rounded"></div>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div
                    key={j}
                    className="border-muted/20 bg-muted/5 rounded-xl border p-4 text-center"
                  >
                    <div className="bg-muted/30 mx-auto mb-2 h-4 w-20 animate-pulse rounded"></div>
                    <div className="bg-muted/30 mx-auto h-6 w-16 animate-pulse rounded"></div>
                  </div>
                ))}
              </div>

              <div className="mb-4 space-y-2">
                <div className="bg-muted/30 h-4 w-full animate-pulse rounded"></div>
                <div className="bg-muted/30 h-3 w-full animate-pulse rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
