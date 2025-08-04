"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "~/components/page-header";

// Define page titles and descriptions for each route
const PAGE_CONFIG = {
  "/": {
    title: "Financial Dashboard",
    description: "Your complete financial overview at a glance",
  },
  "/loans": {
    title: "Loan Management",
    description:
      "Track borrowed and lent money with payment allocation to revenue streams",
  },
  "/revenue-streams": {
    title: "Revenue Stream Allocation",
    description: "Monitor how expenses flow through your revenue streams",
  },
  "/transactions": {
    title: "Transaction Management",
    description: "Track your financial flow with detailed transaction records",
  },
} as const;

export function DynamicPageHeader() {
  const pathname = usePathname();

  // Get the page config for the current route, fallback to dashboard config
  const config =
    PAGE_CONFIG[pathname as keyof typeof PAGE_CONFIG] || PAGE_CONFIG["/"];

  return <PageHeader title={config.title} description={config.description} />;
}
