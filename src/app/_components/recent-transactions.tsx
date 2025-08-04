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
import { initializeData } from "~/lib/financial-utils";

export function RecentTransactions() {
  const data = initializeData();
  const recentTransactions = data.transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

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
        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-2">No transactions yet</p>
            <p className="text-muted-foreground text-sm">
              Add your first transaction to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
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
                    {transaction.category}
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
                  {transaction.amount.toFixed(2)}
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
