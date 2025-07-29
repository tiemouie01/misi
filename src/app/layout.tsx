import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "~/components/theme-provider";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/app-sidebar";
import { Separator } from "~/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "~/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Misi - Liquid Financial Flow",
  description:
    "Track your revenue streams with the fluidity of water. A minimalist financial application with liquid glass aesthetics.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            <AppSidebar />
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
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="relative z-10 flex flex-1 flex-col gap-4 p-4 pt-0">
                {children}
              </div>
            </SidebarInset>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
