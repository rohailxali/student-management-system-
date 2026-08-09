import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { BookOpen, LayoutDashboard, LogOut, PanelLeft, Settings, Users } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";

export const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Students", path: "/students" },
  { icon: Settings, label: "Settings", path: "/settings" },
] as const;

/** Accent dots for the sidebar brand header. */
function GeoAccents() {
  return (
    <>
      <span
        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[oklch(0.85_0.06_255)]/70 pointer-events-none"
        aria-hidden="true"
      />
      <span
        className="absolute -bottom-1 -right-4 h-3.5 w-3.5 rounded-full bg-[oklch(0.88_0.06_20)]/80 pointer-events-none"
        aria-hidden="true"
      />
    </>
  );
}

export default function ScholarlyLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, isAuthenticated } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <span className="geo-shape -top-24 -left-24 h-80 w-80 bg-[oklch(0.85_0.06_255)]/60" aria-hidden="true" />
        <span className="geo-shape -bottom-32 -right-24 h-96 w-96 bg-[oklch(0.9_0.05_20)]/70" aria-hidden="true" />
        <div className="relative flex items-center justify-center min-h-screen px-6">
          <div className="fade-in flex flex-col items-center gap-8 p-10 max-w-md w-full bg-card rounded-2xl card-soft">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BookOpen className="h-5 w-5" />
              </span>
              <span className="font-display text-xl font-bold tracking-tight">Scholarly</span>
            </div>
            <div className="flex flex-col items-center gap-4 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Sign in to continue</h1>
              <p className="text-sm text-muted-foreground max-w-xs font-light">
                Access to this workspace requires authentication. Continue to launch the login flow.
              </p>
            </div>
            <Button onClick={() => startLogin()} size="lg" className="w-full">
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ScholarlyLayoutContent>{children}</ScholarlyLayoutContent>
    </SidebarProvider>
  );
}

function ScholarlyLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const activeItem = NAV_ITEMS.find((item) =>
    item.path === "/" ? location === "/" : location.startsWith(item.path)
  );

  return (
    <>
      <Sidebar className="border-r border-sidebar-border bg-sidebar">
        <SidebarHeader className="h-16 justify-center">
          <div className="flex items-center gap-3 px-2 w-full">
            <button
              onClick={() => toggleSidebar()}
              className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
              aria-label="Toggle navigation"
            >
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            {!isCollapsed && (
              <div className="flex items-center gap-2 min-w-0 relative">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <span className="font-display text-base font-bold tracking-tight truncate">
                  Scholarly
                </span>
                <GeoAccents />
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-2 py-1">
          <SidebarMenu className="gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => setLocation(item.path)}
                    tooltip={item.label}
                    className={`h-10 rounded-lg transition-all ${isActive ? "font-semibold" : "font-normal"}`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-sidebar-accent/60 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-9 w-9 border shrink-0">
                  <AvatarFallback className="text-xs font-medium">
                    {user?.name?.charAt(0).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium truncate leading-none">{user?.name || "-"}</p>
                  <p className="text-xs text-muted-foreground truncate mt-1.5">{user?.email || "-"}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {isMobile && (
          <div className="flex h-14 items-center justify-between bg-background/90 backdrop-blur sticky top-0 z-40 px-3 border-b border-border">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <div className="flex items-center gap-2">
                {activeItem ? (
                  <activeItem.icon className="h-4 w-4 text-muted-foreground" />
                ) : null}
                <span className="tracking-tight font-medium">{activeItem?.label ?? "Scholarly"}</span>
              </div>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
              S
            </span>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
