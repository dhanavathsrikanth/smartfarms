"use client";

import { useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useStoreUserEffect } from "../../useStoreUserEffect";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateFarmDialog } from "@/components/farms/CreateFarmDialog";
import { CreateCropDialog } from "@/components/crops/CreateCropDialog";
import { 
  Sprout,
  TreePine,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Calendar,
  Zap,
  Activity,
  ChevronRight,
  Plus,
  ArrowUpRight,
  History,
  Trophy,
  MapPin,
  ShieldAlert,
  Loader2,
  Receipt,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FarmWithCropStats } from "@/types/farm";
import { CropWithStats } from "@/types/crop";
import { formatINR } from "@/lib/utils";
import { CropStatusBadge } from "@/components/crops/CropStatusBadge";
import { ExpenseCategoryBadge } from "@/app/components/expenses/ExpenseCategoryBadge";
import { QuickExpenseWidget } from "@/app/components/expenses/QuickExpenseWidget";
import { PendingPaymentsWidget } from "@/app/components/sales/PendingPaymentsWidget";
import { PaymentStatusBadge } from "@/app/components/sales/PaymentStatusBadge";

export default function DashboardPage() {
  useStoreUserEffect();

  return (
    <div className="min-h-screen bg-background">
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-secondary" />
            <p className="text-sm text-muted-foreground font-medium tracking-widest uppercase">
              Loading your farm data…
            </p>
          </div>
        </div>
      </AuthLoading>

      <Authenticated>
        <FarmDashboard />
      </Authenticated>

      <Unauthenticated>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Access Restricted</h1>
            <p className="text-muted-foreground max-w-sm">
              Please sign in to access your KhetSmart farm dashboard.
            </p>
          </div>
          <Link href="/">
            <Button className="btn-primary-branding">Return to Home</Button>
          </Link>
        </div>
      </Unauthenticated>
    </div>
  );
}

function FarmDashboard() {
  const { user } = useUser();
  const farms = useQuery(api.farms.listFarms) as FarmWithCropStats[] | undefined;
  const crops = useQuery(api.crops.listAllCrops) as CropWithStats[] | undefined;
  const cropStats = useQuery(api.crops.getCropSummaryStats);
  const [createOpen, setCreateOpen] = useState(false);
  const [createCropOpen, setCreateCropOpen] = useState(false);

  const activeCrops = crops?.filter((c: CropWithStats) => c.status === "active") ?? [];
  const totalArea = farms?.reduce((sum: number, f: FarmWithCropStats) => sum + f.totalArea, 0) ?? 0;

  // This month's expenses
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;
  const recentExpenses = useQuery(api.expenses.listAllExpenses, {});
  const monthExpenses = useQuery(api.expenses.listAllExpenses, {
    startDate: monthStart,
    endDate: monthEnd,
  });
  const monthTotal = monthExpenses?.reduce((s, e) => s + e.amount, 0) ?? 0;

  const recentSales = useQuery(api.sales.listAllSales, {})?.slice(0, 3);
  const currentYearSales = useQuery(api.sales.getSaleSummaryAllFarms, { year: currentYear });
  const lastYearSales = useQuery(api.sales.getSaleSummaryAllFarms, { year: currentYear - 1 });
  
  const currentYearExpenses = useQuery(api.expenses.listAllExpenses, { 
    startDate: `${currentYear}-01-01`, 
    endDate: `${currentYear}-12-31` 
  });
  const lastYearExpenses = useQuery(api.expenses.listAllExpenses, { 
    startDate: `${currentYear - 1}-01-01`, 
    endDate: `${currentYear - 1}-12-31` 
  });

  const yearProfit = (currentYearSales?.totalRevenue || 0) - (currentYearExpenses?.reduce((s, e) => s + e.amount, 0) ?? 0);
  const lastYearProfit = (lastYearSales?.totalRevenue || 0) - (lastYearExpenses?.reduce((s, e) => s + e.amount, 0) ?? 0);
  
  const profitTrend = lastYearProfit !== 0 ? ((yearProfit - lastYearProfit) / Math.abs(lastYearProfit)) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── Welcome greeting ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Good morning, {user?.firstName ?? "Farmer"} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Here&apos;s a summary of your farm operations today.
          </p>
        </div>
        <Button size="sm" className="btn-secondary-branding gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Farm
        </Button>
      </div>

        {/* ── KPI Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Farms"
            value={farms === undefined ? "—" : String(farms.length)}
            icon={<TreePine className="h-4 w-4" />}
            loading={farms === undefined}
            accentColor="text-secondary"
          />
          <StatCard
            label="Active Crops"
            value={cropStats === undefined ? "—" : String(cropStats.totalActiveCrops)}
            icon={<Sprout className="h-4 w-4" />}
            loading={cropStats === undefined}
            accentColor="text-primary-foreground"
            highlighted
          />
          <StatCard
            label="Total Profit This Year"
            value={formatINR(yearProfit)}
            icon={<TrendingUp className="h-4 w-4" />}
            loading={currentYearSales === undefined || currentYearExpenses === undefined}
            accentColor="text-emerald-500"
            trend={{
              value: `${Math.abs(Math.round(profitTrend))}%`,
              isUp: profitTrend >= 0,
              label: "vs last year"
            }}
          />
          <StatCard
            label="Spent This Month"
            value={monthExpenses === undefined ? "—" : formatINR(monthTotal)}
            icon={<TrendingDown className="h-4 w-4" />}
            loading={monthExpenses === undefined}
            accentColor="text-rose-500"
          />
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Farms Overview (2/3 wide) */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Farms Overview Card ── */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TreePine className="h-4 w-4 text-secondary" />
                    Farms Overview
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {farms === undefined ? "Loading…" : `${farms.length} active farm${farms.length !== 1 ? "s" : ""}`}
                  </CardDescription>
                </div>
                <Link href="/dashboard/farms">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Summary pills */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Farms</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">{farms?.length ?? "—"}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/10 border border-secondary/20 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Active Crops</p>
                    <p className="text-xl font-bold text-secondary mt-0.5">{activeCrops.length}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Total Area</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">
                      {farms === undefined ? "—" : totalArea.toFixed(1)}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">ac</span>
                    </p>
                  </div>
                </div>

                {/* Top 3 farms mini-list */}
                {farms === undefined ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : farms.length === 0 ? (
                  <EmptyFarmState onAddClick={() => setCreateOpen(true)} />
                ) : (
                  farms.slice(0, 3).map((farm: FarmWithCropStats) => (
                    <FarmRow key={farm._id} farm={farm} />
                  ))
                )}

                {farms !== undefined && farms.length > 3 && (
                  <Link href="/dashboard/farms">
                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground mt-1">
                      View {farms.length - 3} more farms <ArrowUpRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Recent Crops Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <History className="h-4 w-4 text-secondary" />
                    Recent Crops
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5 text-secondary font-medium">Recently registered cultivation cycles</CardDescription>
                </div>
                <Link href="/dashboard/crops">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                    View list <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {crops === undefined ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : crops.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                    <p className="font-semibold text-foreground">No crops tracked yet</p>
                    <p className="text-xs mt-1">Start by adding a crop to any of your farms.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {crops.slice(0, 3).map((crop: CropWithStats) => (
                      <Link 
                        key={crop._id} 
                        href={`/dashboard/farms/${crop.farmId}/crops/${crop._id}`}
                        className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
                            <Sprout className="h-5 w-5 text-secondary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold leading-none">{crop.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                              <TreePine className="h-2.5 w-2.5" /> {crop.farmName}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <CropStatusBadge status={crop.status} />
                          <p className={`text-xs font-bold ${crop.profit >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                            {crop.profit >= 0 ? "+" : ""}{formatINR(crop.profit)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── Recent Expenses ─── */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-rose-500" />
                    Recent Expenses
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {monthExpenses === undefined ? "Loading…" : `${formatINR(monthTotal)} spent this month`}
                  </CardDescription>
                </div>
                <Link href="/dashboard/expenses">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentExpenses === undefined ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : recentExpenses.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                    <p className="font-semibold text-foreground">No expenses recorded yet</p>
                    <p className="text-xs mt-1">Add your first expense via any crop page.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentExpenses.slice(0, 5).map((expense) => (
                      <Link
                        key={expense._id}
                        href={`/dashboard/expenses`}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                      >
                        <ExpenseCategoryBadge category={expense.category} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{expense.cropName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{expense.farmName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold font-mono">{formatINR(expense.amount)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(expense.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </Link>
                    ))}
                    <Link href="/dashboard/expenses">
                      <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground mt-2 gap-1">
                        View all expenses <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── Recent Sales ─── */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-emerald-600" />
                    Recent Sales
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Last 3 transactions recorded
                  </CardDescription>
                </div>
                <Link href="/dashboard/sales">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentSales === undefined ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : recentSales.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                    <p className="font-semibold text-foreground">No sales recorded yet</p>
                    <p className="text-xs mt-1">Grow your business by logging your first sale.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentSales.map((sale) => (
                      <Link
                        key={sale._id}
                        href="/dashboard/sales"
                        className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                            <ShoppingCart className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold leading-none">{sale.cropName}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                              <Users className="h-2.5 w-2.5" /> {sale.buyerName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right space-y-1.5">
                          <p className="text-sm font-bold font-mono text-emerald-600 leading-none">
                            {formatINR(sale.totalAmount)}
                          </p>
                          <div className="flex items-center justify-end">
                            <PaymentStatusBadge status={sale.paymentStatus} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Sidebar (1/3 wide) */}
          <div className="space-y-6">

            {/* Quick Expense Widget */}
            <QuickExpenseWidget />

            {/* Pending Payments Widget */}
            <PendingPaymentsWidget />

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <QuickAction icon={<TreePine className="h-4 w-4" />} label="Register Farm" primary onClick={() => setCreateOpen(true)} />
                <QuickAction icon={<Sprout className="h-4 w-4" />} label="Add New Crop" onClick={() => setCreateCropOpen(true)} />
                <QuickAction icon={<Receipt className="h-4 w-4" />} label="Record Expense" href="/dashboard/expenses" />
                <QuickAction icon={<TrendingUp className="h-4 w-4" />} label="Log a Sale" />
              </CardContent>
            </Card>

            {/* Operator Card */}
            <Card className="border-l-4 border-l-secondary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Operator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.imageUrl} />
                    <AvatarFallback className="bg-secondary text-white text-sm font-bold">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold leading-none">{user?.fullName ?? "Farmer"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user?.primaryEmailAddress?.emailAddress}</p>
                  </div>
                </div>
                <Separator className="mb-4" />
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Account Status</span>
                    <Badge className="bg-primary text-black text-[10px] font-bold rounded-sm px-1.5 h-4">Active</Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Farms Registered</span>
                    <span className="font-semibold">{farms?.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Crops</span>
                    <span className="font-semibold">{crops?.length ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Season Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-secondary" />
                  Season Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(["kharif", "rabi", "zaid", "annual"] as const).map((season) => {
                  const count = crops?.filter((c: CropWithStats) => c.season === season).length ?? 0;
                  return (
                    <div key={season} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${seasonColor(season)}`} />
                        <span className="text-xs capitalize text-muted-foreground">{season}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{count} crop{count !== 1 ? "s" : ""}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

          </div>
        </div>

      <CreateFarmDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CreateCropDialog open={createCropOpen} onOpenChange={setCreateCropOpen} />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label, value, unit, icon, loading, accentColor, highlighted,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  loading?: boolean;
  accentColor?: string;
  highlighted?: boolean;
  trend?: {
    value: string;
    isUp: boolean;
    label: string;
  };
}) {
  return (
    <Card className={highlighted ? "bg-secondary text-white border-secondary" : ""}>
      <CardContent className="p-5">
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="h-7 w-10 bg-muted rounded" />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${highlighted ? "text-white/70" : "text-muted-foreground"}`}>
              <span className={highlighted ? "text-white/70" : accentColor}>{icon}</span>
              {label}
            </div>
            <div className="flex items-end justify-between gap-1.5">
              <div className="flex items-end gap-1.5">
                <span className={`text-2xl font-bold tracking-tight ${highlighted ? "text-white" : "text-foreground"}`}>{value}</span>
                {unit && <span className={`text-xs mb-0.5 ${highlighted ? "text-white/60" : "text-muted-foreground"}`}>{unit}</span>}
              </div>
              {trend && (
                <div className={`flex items-center gap-0.5 text-[10px] font-bold ${trend.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {trend.isUp ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {trend.value}
                </div>
              )}
            </div>
            {trend && (
              <p className="text-[9px] text-muted-foreground font-medium -mt-1">{trend.label}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FarmRow({ farm }: { farm: FarmWithCropStats }) {
  return (
    <Link href={`/dashboard/farms/${farm._id}`}>
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors group cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10 shrink-0">
            <TreePine className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{farm.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" /> {farm.location}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 ml-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs text-muted-foreground">Area</p>
            <p className="text-sm font-semibold">{farm.totalArea} {farm.areaUnit}</p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs text-muted-foreground">Crops</p>
            <p className="text-sm font-semibold">
              {farm.activeCrops}<span className="text-muted-foreground font-normal">/{farm.totalCrops}</span>
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Link>
  );
}

function QuickAction({ icon, label, primary, onClick, href }: { icon: React.ReactNode; label: string; primary?: boolean; onClick?: () => void; href?: string }) {
  const btn = (
    <Button
      variant={primary ? "default" : "outline"}
      className={`w-full justify-start gap-2 text-sm font-medium h-9 ${primary ? "btn-primary-branding" : ""}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
  if (href) return <Link href={href}>{btn}</Link>;
  return btn;
}

function EmptyFarmState({ onAddClick }: { onAddClick?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <TreePine className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">No farms registered yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Register your first farm to start tracking crops, expenses, and yields.
        </p>
      </div>
      <Button size="sm" className="mt-2 btn-primary-branding gap-2" onClick={onAddClick}>
        <Plus className="h-4 w-4" />
        Register First Farm
      </Button>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 bg-muted rounded" />
        <div className="h-2.5 w-20 bg-muted rounded" />
      </div>
    </div>
  );
}

function seasonColor(season: "kharif" | "rabi" | "zaid" | "annual"): string {
  const map: Record<string, string> = {
    kharif: "bg-blue-500",
    rabi: "bg-orange-500",
    zaid: "bg-purple-500",
    annual: "bg-slate-400",
  };
  return map[season] ?? "bg-slate-400";
}
