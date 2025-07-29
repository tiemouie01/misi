"use client";

import Link from "next/link";
import { ThemeToggle } from "~/components/theme-toggle";
import {
  Droplets,
  Waves,
  Home,
  CreditCard,
  Target,
  FileText,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

interface FinancialLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export function FinancialLayout({
  children,
  title,
  description,
}: FinancialLayoutProps) {
  const pathname = usePathname();

  const navigationItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/revenue-streams", label: "Revenue Streams", icon: Target },
    { href: "/transactions", label: "Transactions", icon: FileText },
    { href: "/loans", label: "Loans", icon: CreditCard },
  ];

  return (
    <div className="bg-background min-h-screen">
      {/* Floating water droplets background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="float absolute top-20 left-10 h-4 w-4 rounded-full bg-cyan-400/20"></div>
        <div
          className="float absolute top-40 right-20 h-6 w-6 rounded-full bg-blue-400/15"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="float absolute bottom-32 left-1/4 h-3 w-3 rounded-full bg-indigo-400/25"
          style={{ animationDelay: "4s" }}
        ></div>
        <div
          className="float absolute right-1/3 bottom-20 h-5 w-5 rounded-full bg-cyan-400/20"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 container mx-auto max-w-7xl p-6">
        {/* Header with frosted glass effect */}
        <div className="frosted mb-8 rounded-2xl p-8">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3 shadow-lg">
                <Droplets className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="gradient-text mb-2 text-4xl font-bold">Misi</h1>
                <p className="text-foreground/80 text-lg font-medium">
                  Liquid Financial Flow
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <div className="text-foreground/70 flex items-center space-x-2">
            <Waves className="h-4 w-4" />
            <span className="text-sm font-medium">
              Track your revenue streams with the fluidity of water
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="frosted mb-8 rounded-xl p-2">
          <nav className="flex space-x-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center space-x-2 transition-all duration-200",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h2 className="gradient-text mb-2 text-3xl font-semibold">{title}</h2>
          <p className="text-muted-foreground text-lg">{description}</p>
        </div>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
