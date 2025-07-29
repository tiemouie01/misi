"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FinancialLayout } from "~/components/financial-layout";
import { OverviewCardsGrid } from "~/components/overview-cards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  FileText,
  CreditCard,
  ArrowRight,
  Plus,
} from "lucide-react";
import {
  initializeData,
  calculateRevenueStreams,
  calculateTotals,
  calculateLoanTotals,
} from "~/lib/financial-utils";
import { Transaction, Category, Loan } from "~/lib/types";

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  // Load data on component mount
  useEffect(() => {
    const data = initializeData();
    setTransactions(data.transactions);
    setCategories(data.categories);
    setLoans(data.loans);
  }, []);

  // Listen for changes from other pages
  useEffect(() => {
    const handleStorageChange = () => {
      const data = initializeData();
      setTransactions(data.transactions);
      setCategories(data.categories);
      setLoans(data.loans);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("financialDataUpdate", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("financialDataUpdate", handleStorageChange);
    };
  }, []);

  const revenueStreams = calculateRevenueStreams(transactions, categories);
  const { totalIncome, totalExpenses, totalRemaining } =
    calculateTotals(revenueStreams);
  const { totalBorrowed, totalLent } = calculateLoanTotals(loans);

  const overviewCards = [
    {
      title: "Total Revenue",
      value: `$${totalIncome.toFixed(2)}`,
      description: "Flowing income streams",
      icon: TrendingUp,
      iconColor: "bg-emerald-400/20",
      valueColor: "text-emerald-400",
    },
    {
      title: "Total Expenses",
      value: `$${totalExpenses.toFixed(2)}`,
      description: "Allocated costs",
      icon: TrendingDown,
      iconColor: "bg-rose-400/20",
      valueColor: "text-rose-400",
    },
    {
      title: "Net Balance",
      value: `$${totalRemaining.toFixed(2)}`,
      description: "Available liquidity",
      icon: DollarSign,
      iconColor: "bg-cyan-400/20",
      valueColor: totalRemaining >= 0 ? "text-cyan-400" : "text-rose-400",
    },
    {
      title: "Active Loans",
      value: loans.length.toString(),
      description: "Loans in portfolio",
      icon: Target,
      iconColor: "bg-indigo-400/20",
      valueColor: "text-indigo-400",
    },
  ];

  const quickActions = [
    {
      title: "Add Transaction",
      description: "Record income or expense",
      href: "/transactions",
      icon: Plus,
      color: "from-emerald-400 to-cyan-400",
    },
    {
      title: "View Revenue Streams",
      description: "Monitor allocation flow",
      href: "/revenue-streams",
      icon: Target,
      color: "from-blue-400 to-indigo-400",
    },
    {
      title: "Manage Loans",
      description: "Track borrowing & lending",
      href: "/loans",
      icon: CreditCard,
      color: "from-purple-400 to-pink-400",
    },
  ];

  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <FinancialLayout
      title="Financial Dashboard"
      description="Your complete financial overview at a glance"
    >
      <OverviewCardsGrid cards={overviewCards} />

      {/* Quick Actions */}
      <div className="mb-8">
        <h3 className="gradient-text mb-4 text-xl font-semibold">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="glass-card group cursor-pointer border-0 transition-all duration-300 hover:scale-105">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`rounded-xl bg-gradient-to-br ${action.color} p-3 shadow-lg transition-shadow group-hover:shadow-xl`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="mb-1 text-lg font-semibold">
                          {action.title}
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Streams Summary */}
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
            {revenueStreams.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground mb-2">
                  No revenue streams yet
                </p>
                <p className="text-muted-foreground text-sm">
                  Add income transactions to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {revenueStreams.slice(0, 3).map((stream) => (
                  <div key={stream.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`h-3 w-3 rounded-full ${stream.color}`}
                        />
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
                          ? (stream.allocatedExpenses / stream.totalIncome) *
                            100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>
                ))}
                {revenueStreams.length > 3 && (
                  <p className="text-muted-foreground pt-2 text-center text-sm">
                    +{revenueStreams.length - 3} more streams
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
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
                <p className="text-muted-foreground mb-2">
                  No transactions yet
                </p>
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
      </div>

      {/* Loan Summary */}
      {loans.length > 0 && (
        <Card className="glass-card mt-6 border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Loan Portfolio Summary</CardTitle>
              <CardDescription>
                Overview of borrowing and lending
              </CardDescription>
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
                <div className="text-muted-foreground text-sm">
                  Total Borrowed
                </div>
                <div className="text-xl font-bold text-rose-400">
                  ${totalBorrowed.toFixed(2)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {loans.filter((l) => l.type === "borrowed").length} loan(s)
                </div>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
                <div className="text-muted-foreground text-sm">Total Lent</div>
                <div className="text-xl font-bold text-emerald-400">
                  ${totalLent.toFixed(2)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {loans.filter((l) => l.type === "lent").length} loan(s)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </FinancialLayout>
  );
}
