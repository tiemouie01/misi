"use client";

import { usePathname } from "next/navigation";
import { Waves } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  const pathname = usePathname();

  // Create breadcrumbs based on current path and title
  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: "Dashboard", href: "/" }];

    if (pathname !== "/" && title !== "Financial Dashboard") {
      breadcrumbs.push({ label: title, href: pathname });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      {/* Page Header */}
      <div className="frosted rounded-2xl p-6">
        <div className="mb-4 flex items-center space-x-2">
          <Waves className="text-foreground/70 h-5 w-5" />
          <span className="text-foreground/70 text-sm font-medium">
            Track your revenue streams with the fluidity of water
          </span>
        </div>
        <div>
          <h1 className="gradient-text mb-2 text-3xl font-semibold">{title}</h1>
          <p className="text-muted-foreground text-lg">{description}</p>
        </div>
      </div>
    </>
  );
}
