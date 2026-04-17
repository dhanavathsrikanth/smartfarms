"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Authenticated, AuthLoading, useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Landmark,
  Sprout,
  Receipt,
  ShoppingCart,
  FileText,
  BrainCircuit,
  Settings,
  Leaf,
  BarChart3,
  Menu,
  X,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertsPanel } from "@/app/components/analytics/AlertsPanel";

// ─── Nav config ─────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  comingSoon?: boolean;
  subItems?: { label: string; href: string }[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",   href: "/dashboard",              icon: LayoutDashboard  },
  { label: "My Farms",    href: "/dashboard/farms",         icon: Landmark         },
  { label: "Crops",       href: "/dashboard/crops",         icon: Sprout },
  { label: "Expenses",    href: "/dashboard/expenses",      icon: Receipt },
  { label: "Sales",       href: "/dashboard/sales",         icon: ShoppingCart, 
    subItems: [
      { label: "All Sales", href: "/dashboard/sales" },
      { label: "Buyers", href: "/dashboard/sales/buyers" },
    ]
  },
  { label: "Analytics",   href: "/dashboard/analytics",    icon: BarChart3,
    subItems: [
      { label: "Overview",     href: "/dashboard/analytics" },
      { label: "Crop Planner", href: "/dashboard/analytics" },
      { label: "Reports",      href: "/dashboard/analytics/report" },
    ]
  },
  { label: "AI Advisor",  href: "/dashboard/ai-advisor",    icon: BrainCircuit, comingSoon: true },
  { label: "Settings",    href: "/dashboard/settings",      icon: Settings, comingSoon: true },
];

// ─── Root Layout ────────────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated } = useConvexAuth();

  // Fetch current user to check admin role (Convex users table OR Clerk publicMetadata)
  const currentUser = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  const { user: clerkUser } = useUser();
  const isAdmin = currentUser?.role === "admin" || (clerkUser?.publicMetadata?.role as string) === "admin";

  const insights = useQuery(
    api.expenses.getExpenseInsights,
    isAuthenticated ? {} : "skip"
  );

  // Fetch Sales pending count at the top level — fixes React Hook Rules (no hooks in loops)
  const salesSummary = useQuery(
    api.sales.getSaleSummaryAllFarms,
    isAuthenticated ? {} : "skip"
  );
  const hasPendingSales = (salesSummary?.totalPendingCount ?? 0) > 0;

  const hasInsights =
    insights &&
    (insights.categorySpike !== null ||
      insights.unusualExpense !== null ||
      (insights.missingCategories?.length ?? 0) > 0 ||
      insights.topSupplier !== null ||
      (insights.expenseForecast?.estimatedRemainingAmount ?? 0) > 0);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header / Logo */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary shrink-0">
              <Leaf className="h-4 w-4 text-white" />
            </div>
            <div className="leading-none">
              <p className="font-bold text-sm text-foreground tracking-tight">KhetSmart</p>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">Farm OS</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink 
              key={item.href} 
              item={item} 
              onNavigate={() => setSidebarOpen(false)} 
              hasBadge={
                (item.label === "Expenses" && !!hasInsights) ||
                (item.label === "Sales" && hasPendingSales)
              }
            />
          ))}
          {/* Admin-only nav item */}
          {isAdmin && (
            <NavLink
              item={{ label: "Admin", href: "/dashboard/admin", icon: ShieldAlert }}
              onNavigate={() => setSidebarOpen(false)}
            />
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="shrink-0 border-t border-border p-4">
          <AuthLoading>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                <div className="h-2.5 w-32 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </AuthLoading>
          <Authenticated>
            <SidebarUserFooter />
          </Authenticated>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* ── Top Bar ── */}
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── NavLink ────────────────────────────────────────────────────────────────

function NavLink({ 
  item, 
  onNavigate, 
  hasBadge,
}: { 
  item: NavItem; 
  onNavigate: () => void; 
  hasBadge?: boolean;
}) {
  const pathname = usePathname();

  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  const Icon = item.icon;

  if (item.comingSoon) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium cursor-default select-none",
          "text-muted-foreground/50"
        )}
        title="Coming soon"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        <Badge
          variant="outline"
          className="text-[9px] font-semibold px-1.5 h-4 border-border text-muted-foreground/60 uppercase tracking-wide"
        >
          Soon
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-secondary/10 text-secondary font-semibold"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isActive ? "text-secondary" : "text-muted-foreground"
          )}
        />
        <div className="flex-1 min-w-0 flex items-center justify-between">
          <span className="truncate">{item.label}</span>
          {hasBadge && (
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 ml-2" />
          )}
        </div>
        {isActive && !item.subItems && (
          <ChevronRight className="h-3 w-3 text-secondary/60 shrink-0" />
        )}
      </Link>
      
      {/* Sub-items rendered if parent is active and has them */}
      {isActive && item.subItems && (
        <div className="ml-9 space-y-1 border-l border-border/50 pl-3 py-1 mt-1">
          {item.subItems.map((sub) => {
            const isSubActive = pathname === sub.href;
            return (
              <Link
                key={`${sub.label}-${sub.href}`}
                href={sub.href}
                onClick={onNavigate}
                className={cn(
                  "block py-1.5 text-xs font-medium transition-colors",
                  isSubActive 
                    ? "text-secondary font-bold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {sub.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Top Bar ────────────────────────────────────────────────────────────────

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 sm:px-6 shrink-0">
      {/* Left: Hamburger (mobile) + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo — visible only when sidebar is collapsed (mobile) */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 lg:hidden"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary">
            <Leaf className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-foreground tracking-tight">KhetSmart</span>
        </Link>

        {/* Desktop breadcrumb / page title slot — empty, pages render their own breadcrumbs */}
        <div className="hidden lg:block">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary">
              <Leaf className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-foreground tracking-tight">KhetSmart</span>
            <Badge variant="outline" className="text-[10px] font-normal ml-1">Farm OS</Badge>
          </Link>
        </div>
      </div>

      {/* Right: Bell + User */}
      <div className="flex items-center gap-2">
        <AuthLoading>
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </AuthLoading>
        <Authenticated>
          <TopBarUser />
        </Authenticated>
      </div>
    </header>
  );
}

// ─── Top Bar User ────────────────────────────────────────────────────────────

function TopBarUser() {
  const { user } = useUser();

  return (
    <div className="flex items-center gap-2">
      {/* Notification bell with live alerts panel */}
      <AlertsPanel />

      <Separator orientation="vertical" className="h-6" />

      {/* User avatar + name */}
      <div className="flex items-center gap-2.5 pl-1">
        <div className="hidden sm:block text-right leading-none">
          <p className="text-xs font-semibold text-foreground">{user?.fullName ?? "Farmer"}</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        <Avatar className="h-8 w-8 ring-2 ring-secondary/20">
          <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? ""} />
          <AvatarFallback className="bg-secondary text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

// ─── Sidebar User Footer ─────────────────────────────────────────────────────

function SidebarUserFooter() {
  const { user } = useUser();
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8 shrink-0 ring-2 ring-secondary/20">
        <AvatarImage src={user?.imageUrl} />
        <AvatarFallback className="bg-secondary text-white text-xs font-bold">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground truncate leading-none">
          {user?.fullName ?? "Farmer"}
        </p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
          {user?.primaryEmailAddress?.emailAddress}
        </p>
      </div>
      <div className="ml-auto shrink-0">
        <div className="h-2 w-2 rounded-full bg-emerald-500" title="Online" />
      </div>
    </div>
  );
}
