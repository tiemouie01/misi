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
import { getRecentTransactions } from "~/server/db/queries";

export async function RecentTransactions() {
  // TODO: Replace with actual user ID from authentication
  const userId = "cmdr1xnpujgm4ta";

  const { data: recentTransactions, error } = await getRecentTransactions(
    userId,
    5,
  );

  if (error) {
    return (
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <CardDescription>Error loading recent transactions</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const transactions = recentTransactions ?? [];

  return (
    <Card className="glass-card border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <CardDescription>Latest financial activity</CardDescription>
        </div>
        <Link href="/transactions">
          <Button variant="ghost" size="sm" className="glass">
            View All <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-2">No transactions yet</p>
            <p className="text-muted-foreground text-sm">
              Add your first transaction to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="border-muted/20 flex items-center justify-between border-b py-2 last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="truncate font-medium">
                      {transaction.description}
                    </span>
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        transaction.type === "income"
                          ? "bg-emerald-400/20 text-emerald-400"
                          : "bg-rose-400/20 text-rose-400"
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {transaction.categoryName}
                  </p>
                </div>
                <span
                  className={`font-semibold ${
                    transaction.type === "income"
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"}$
                  {Number(transaction.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton component for loading state
export function RecentTransactionsSkeleton() {
  return (
    <Card className="glass-card border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-2">
          <div className="bg-muted/30 h-5 w-36 animate-pulse rounded"></div>
          <div className="bg-muted/30 h-4 w-32 animate-pulse rounded"></div>
        </div>
        <div className="bg-muted/30 h-8 w-20 animate-pulse rounded"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="border-muted/20 flex items-center justify-between border-b py-2"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="bg-muted/30 h-4 w-32 animate-pulse rounded"></div>
                  <div className="bg-muted/30 h-5 w-16 animate-pulse rounded"></div>
                </div>
                <div className="bg-muted/30 h-3 w-24 animate-pulse rounded"></div>
              </div>
              <div className="bg-muted/30 h-4 w-16 animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
