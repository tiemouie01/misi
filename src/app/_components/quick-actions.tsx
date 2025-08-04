import Link from "next/link";
import { Card, CardContent } from "~/components/ui/card";
import { Plus, Target, CreditCard, ArrowRight } from "lucide-react";

export function QuickActions() {
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

  return (
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
  );
}

// Skeleton component for loading state
export function QuickActionsSkeleton() {
  return (
    <div className="mb-8">
      <div className="bg-muted/30 mb-4 h-6 w-32 animate-pulse rounded"></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card rounded-xl border-0 p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-muted/30 h-12 w-12 animate-pulse rounded-xl"></div>
              <div className="flex-1 space-y-2">
                <div className="bg-muted/30 h-4 w-24 animate-pulse rounded"></div>
                <div className="bg-muted/30 h-3 w-32 animate-pulse rounded"></div>
              </div>
              <div className="bg-muted/30 h-5 w-5 animate-pulse rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
