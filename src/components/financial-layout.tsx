"use client";

import { Waves } from "lucide-react";
import { SidebarInset, SidebarTrigger } from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

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
  // Create breadcrumbs based on title
  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: "Dashboard", href: "/" }];

    if (title !== "Financial Dashboard") {
      breadcrumbs.push({ label: title, href: "#" });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <SidebarInset>
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

      {/* Header with sidebar trigger and breadcrumbs */}
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((breadcrumb, index) => (
                <div key={breadcrumb.label} className="flex items-center gap-2">
                  <BreadcrumbItem className="hidden md:block">
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={breadcrumb.href}>
                        {breadcrumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Page Header */}
        <div className="frosted rounded-2xl p-6">
          <div className="mb-4 flex items-center space-x-2">
            <Waves className="text-foreground/70 h-5 w-5" />
            <span className="text-foreground/70 text-sm font-medium">
              Track your revenue streams with the fluidity of water
            </span>
          </div>
          <div>
            <h1 className="gradient-text mb-2 text-3xl font-semibold">
              {title}
            </h1>
            <p className="text-muted-foreground text-lg">{description}</p>
          </div>
        </div>

        {/* Page Content */}
        <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
          {children}
        </div>
      </div>
    </SidebarInset>
  );
}
