import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { ArrowRight } from "lucide-react";
import { getFinancialSummary, getLoanCountsByType } from "~/server/db/queries";

export async function LoanSummary() {
  // TODO: Replace with actual user ID from authentication
  const userId = "cmdr1xnpujgm4ta";

  const [financialResult, countsResult] = await Promise.all([
    getFinancialSummary(userId),
    getLoanCountsByType(userId),
  ]);

  if (financialResult.error || countsResult.error) {
    return null; // Silently fail for this summary component
  }

  const { totalBorrowed, totalLent, activeLoans } = financialResult.data!;
  const { borrowedCount, lentCount } = countsResult.data!;

  if (activeLoans === 0) {
    return null;
  }

  return (
    <Card className="glass-card mt-6 border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Loan Portfolio Summary</CardTitle>
          <CardDescription>Overview of borrowing and lending</CardDescription>
        </div>
        <Link href="/loans">
          <Button variant="ghost" size="sm" className="glass">
            Manage Loans <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-center">
            <div className="text-muted-foreground text-sm">Total Borrowed</div>
            <div className="text-xl font-bold text-rose-400">
              ${totalBorrowed.toFixed(2)}
            </div>
            <div className="text-muted-foreground text-xs">
              {borrowedCount} loan(s)
            </div>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
            <div className="text-muted-foreground text-sm">Total Lent</div>
            <div className="text-xl font-bold text-emerald-400">
              ${totalLent.toFixed(2)}
            </div>
            <div className="text-muted-foreground text-xs">
              {lentCount} loan(s)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton component for loading state
export function LoanSummarySkeleton() {
  return (
    <Card className="glass-card mt-6 border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-2">
          <div className="bg-muted/30 h-5 w-40 animate-pulse rounded"></div>
          <div className="bg-muted/30 h-4 w-48 animate-pulse rounded"></div>
        </div>
        <div className="bg-muted/30 h-8 w-28 animate-pulse rounded"></div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="border-muted/20 bg-muted/5 rounded-xl border p-4 text-center"
            >
              <div className="bg-muted/30 mx-auto mb-2 h-4 w-24 animate-pulse rounded"></div>
              <div className="bg-muted/30 mx-auto mb-1 h-6 w-20 animate-pulse rounded"></div>
              <div className="bg-muted/30 mx-auto h-3 w-16 animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
