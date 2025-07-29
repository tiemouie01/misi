"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Droplets,
  Home,
  Target,
  FileText,
  CreditCard,
  Waves,
  ChevronUp,
  User2,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/components/ui/sidebar";
import { ThemeToggle } from "~/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

// Navigation items for the sidebar
const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Revenue Streams",
    url: "/revenue-streams",
    icon: Target,
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: FileText,
  },
  {
    title: "Loans",
    url: "/loans",
    icon: CreditCard,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-0">
      <SidebarHeader className="border-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="glass-card mb-2 border-0"
            >
              <Link href="/">
                <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-2 shadow-lg">
                  <Droplets className="h-6 w-6 text-white" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="gradient-text text-lg font-bold">Misi</span>
                  <span className="text-muted-foreground text-xs">
                    Liquid Financial Flow
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground flex items-center gap-2">
            <Waves className="h-4 w-4" />
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isActive
                          ? "glass-card bg-primary/20 text-primary border-0"
                          : "glass hover:glass-card"
                      }
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="glass hover:glass-card">
                  <User2 className="h-6 w-6" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      Financial Manager
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      Manage your flow
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="glass-card w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border-0"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem className="gap-2">
                  <ThemeToggle />
                  <span>Toggle Theme</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
