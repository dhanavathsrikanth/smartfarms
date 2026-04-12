"use client";

import { useQuery, useMutation, Authenticated, AuthLoading } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import {
  ChevronRight,
  Home,
  Sprout,
  Pencil,
  Wheat,
  MoreVertical,
  Trash2,
  Archive,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  Calendar as CalendarIcon,
  MapPin,
  Loader2,
  FileText,
  ImageIcon,
  History,
  Bug,
  LineChart as LineChartIcon,
  DollarSign,
  BarChart3,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { CropStatusBadge } from "@/components/crops/CropStatusBadge";
import { CropSeasonBadge } from "@/components/crops/CropSeasonBadge";
import { EditCropDialog } from "@/components/crops/EditCropDialog";
import { MarkHarvestedDialog } from "@/components/crops/MarkHarvestedDialog";
import { CropTimeline } from "@/components/crops/CropTimeline";
import { CropPhotoDiary } from "@/components/crops/CropPhotoDiary";
import { CropWithStats, CropTimelineEvent } from "@/types/crop";
import { formatINR, formatArea } from "@/lib/utils";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ExpenseList,
  ExpenseSummaryCard,
  ExpenseCategoryChart,
} from "@/app/components/expenses";
import { AddExpenseForm } from "@/app/components/expenses/AddExpenseForm";
import { BulkExpenseDialog } from "@/app/components/expenses/BulkExpenseDialog";
import {
  SaleList,
  ProfitWaterfallChart,
  AddSaleForm
} from "@/app/components/sales";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useStoreUserEffect } from "../../../../../../useStoreUserEffect";

// ─── Page Shell (Auth Guard) ──────────────────────────────────────────────────

export default function CropDetailPage() {
  useStoreUserEffect();

  return (
    <div className="min-h-screen bg-background">
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-secondary" />
            <p className="text-sm text-muted-foreground font-medium tracking-widest uppercase">
              Loading crop data…
            </p>
          </div>
        </div>
      </AuthLoading>
      <Authenticated>
        <CropDetailContent />
      </Authenticated>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function CropDetailContent() {
  const params = useParams();
  const router = useRouter();
  const farmId = params.farmId as Id<"farms">;
  const cropId = params.cropId as Id<"crops">;

  // Dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [harvestOpen, setHarvestOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [bulkExpenseOpen, setBulkExpenseOpen] = useState(false);
  const [addSaleOpen, setAddSaleOpen] = useState(false);

  // Queries
  const crop = useQuery(api.crops.getCrop, { cropId }) as CropWithStats | undefined | null;
  const timeline = useQuery(api.crops.getCropTimeline, { cropId });
  const photos = useQuery(api.cropPhotos.getPhotosByCrop, { cropId });
  const expenseSummary = useQuery(api.expenses.getExpenseSummaryByCrop, { cropId });
  const saleSummary = useQuery(api.sales.getSaleSummaryByCrop, { cropId });
  const profitTimeline = useQuery(api.sales.getSalesVsExpensesTimeline, { cropId });

  // Mutations
  const archiveCrop = useMutation(api.crops.archiveCrop);
  const deleteCrop = useMutation(api.crops.deleteCrop);

  // ── Chart Data: monthly expenses vs sales ──────────────────────────────────
  const chartData = useMemo(() => {
    if (!timeline) return [];

    // Accumulate by YYYY-MM key (sorts reliably)
    const monthlyData: Record<
      string,
      { monthKey: string; month: string; expenses: number; sales: number }
    > = {};

    (timeline as CropTimelineEvent[]).forEach((event) => {
      const date = new Date(event.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          monthKey,
          month: monthLabel,
          expenses: 0,
          sales: 0,
        };
      }

      if (event.type === "expense" && "amount" in event) {
        monthlyData[monthKey].expenses += (event as { amount: number }).amount;
      } else if (event.type === "sale" && "amount" in event) {
        monthlyData[monthKey].sales += (event as { amount: number }).amount;
      }
    });

    return Object.values(monthlyData).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    );
  }, [timeline]);

  // ── Days Active ────────────────────────────────────────────────────────────
  const daysActive = useMemo(() => {
    if (!crop) return 0;
    const end = crop.actualHarvestDate
      ? new Date(crop.actualHarvestDate)
      : new Date();
    const start = new Date(crop.sowingDate);
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
  }, [crop]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleArchive = async () => {
    try {
      await archiveCrop({ cropId });
      toast.success("Crop record archived.");
    } catch {
      toast.error("Failed to archive crop.");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCrop({ cropId });
      toast.success("Crop permanently deleted.");
      router.push(`/dashboard/farms/${farmId}`);
    } catch {
      toast.error("Deletion failed.");
      setIsDeleting(false);
    }
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (crop === undefined) return <CropDetailSkeleton />;
  if (crop === null) {
    router.push("/dashboard/farms");
    return null;
  }

  return (
    <div className="min-h-screen pb-16">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-border/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
          {/* Breadcrumb */}
          <nav className="flex items-center flex-wrap gap-1 text-xs font-medium text-muted-foreground">
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home className="h-3 w-3" />
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link
              href="/dashboard/farms"
              className="hover:text-foreground transition-colors"
            >
              Farms
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link
              href={`/dashboard/farms/${farmId}`}
              className="hover:text-foreground transition-colors"
            >
              {crop.farmName}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-bold">{crop.name}</span>
          </nav>

          {/* Title Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Identity */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 shadow-inner ring-1 ring-secondary/20">
                <Sprout className="h-6 w-6 text-secondary" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-none">
                  {crop.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  {crop.variety && (
                    <p className="text-sm font-medium text-muted-foreground">
                      {crop.variety}
                    </p>
                  )}
                  <CropStatusBadge status={crop.status} />
                  <CropSeasonBadge season={crop.season} />
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-2"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit Crop
              </Button>

              {crop.status === "active" && (
                <Button
                  size="sm"
                  className="h-10 gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20"
                  onClick={() => setHarvestOpen(true)}
                >
                  <Wheat className="h-4 w-4" />
                  <span className="hidden sm:inline">Mark as Harvested</span>
                  <span className="sm:hidden">Harvest</span>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <MoreVertical className="h-5 w-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={handleArchive}
                    disabled={crop.status === "archived"}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Cycle
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* ── Page Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Stat Cards Row ── */}
        <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar">
          <StatCard
            label="Total Expenses"
            value={formatINR(crop.totalExpenses)}
            colorClass="bg-red-500/10 text-red-700 border-red-500/20"
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <StatCard
            label="Total Sales"
            value={formatINR(crop.totalSales)}
            colorClass="bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            label="Net Profit"
            value={(crop.profit >= 0 ? "+" : "") + formatINR(crop.profit)}
            colorClass={
              crop.profit >= 0
                ? "bg-green-500/10 text-green-700 border-green-500/20"
                : "bg-rose-500/10 text-rose-700 border-rose-500/20"
            }
            icon={<LineChartIcon className="h-4 w-4" />}
          />
          <StatCard
            label="Total Area"
            value={formatArea(crop.area, crop.areaUnit)}
            colorClass="bg-blue-500/10 text-blue-700 border-blue-500/20"
            icon={<Layers className="h-4 w-4" />}
          />
          <StatCard
            label="Days Active"
            value={`${daysActive} Days`}
            colorClass="bg-slate-500/10 text-slate-700 border-slate-500/20"
            icon={<Clock className="h-4 w-4" />}
          />
        </div>

        {/* ── Main Layout: Info Card + Tabs ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* ── Crop Info Side Card ── */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-secondary/20 bg-secondary/[0.02] shadow-sm">
              <CardHeader className="pb-3 px-5 pt-5">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-secondary" />
                  Cycle Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-5">
                {/* Dates */}
                <div className="space-y-3">
                  <InfoRow
                    icon={<CalendarIcon className="h-3.5 w-3.5" />}
                    label="Sowing Date"
                    value={new Date(crop.sowingDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  />
                  <InfoRow
                    icon={<Clock className="h-3.5 w-3.5" />}
                    label="Expected Harvest"
                    value={
                      crop.expectedHarvestDate
                        ? new Date(crop.expectedHarvestDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Not set"
                    }
                  />
                  {crop.actualHarvestDate && (
                    <InfoRow
                      icon={<Wheat className="h-3.5 w-3.5 text-amber-600" />}
                      label="Actual Harvest"
                      value={new Date(crop.actualHarvestDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      valueClass="text-amber-700 font-bold"
                    />
                  )}
                </div>

                <Separator className="opacity-40" />

                {/* Farm Details */}
                <div className="space-y-3">
                  <InfoRow
                    icon={<Sprout className="h-3.5 w-3.5" />}
                    label="Season"
                    value={crop.season.charAt(0).toUpperCase() + crop.season.slice(1)}
                  />
                  <InfoRow
                    icon={<CalendarIcon className="h-3.5 w-3.5" />}
                    label="Year"
                    value={crop.year.toString()}
                  />
                  <InfoRow
                    icon={<Home className="h-3.5 w-3.5" />}
                    label="Farm"
                    value={crop.farmName ?? "Unknown Farm"}
                  />
                  <InfoRow
                    icon={<MapPin className="h-3.5 w-3.5" />}
                    label="Location"
                    value={crop.farmLocation || "—"}
                  />
                </div>

                {/* Notes */}
                {crop.notes && (
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 tracking-widest">
                      Notes
                    </p>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      &ldquo;{crop.notes}&rdquo;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Tabs ── */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto flex h-12 bg-muted/50 p-1 mb-6 no-scrollbar rounded-xl">
                <TabsTrigger value="overview" className="gap-1.5 px-4 rounded-lg text-sm">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="expenses" className="gap-1.5 px-4 rounded-lg text-sm">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Expenses
                </TabsTrigger>
                <TabsTrigger value="sales" className="gap-1.5 px-4 rounded-lg text-sm">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="yield" className="gap-1.5 px-4 rounded-lg text-sm">
                  <Wheat className="h-3.5 w-3.5" />
                  Yield
                </TabsTrigger>
                <TabsTrigger value="diary" className="gap-1.5 px-4 rounded-lg text-sm">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Photo Diary
                </TabsTrigger>
                <TabsTrigger value="pest" className="gap-1.5 px-4 rounded-lg text-sm">
                  <Bug className="h-3.5 w-3.5" />
                  Pest Log
                </TabsTrigger>
              </TabsList>

              {/* ── Tab 1: Overview ── */}
              <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">

                {/* Activity Timeline */}
                <Card className="shadow-sm border-border/50">
                  <CardHeader className="pb-3 px-6">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <History className="h-4 w-4 text-secondary" />
                      Activity Timeline
                    </CardTitle>
                    <CardDescription>Full event history for this crop cycle</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 max-h-[420px] overflow-y-auto no-scrollbar">
                    <CropTimeline cropId={cropId} />
                  </CardContent>
                </Card>

                {/* Performance Chart */}
                <Card className="shadow-sm border-border/50 overflow-hidden">
                  <CardHeader className="pb-2 px-6">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-secondary" />
                      Cycle Performance
                    </CardTitle>
                    <CardDescription>
                      Monthly breakdown of expenses vs revenue
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[280px] w-full pt-2 px-2 pb-4">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="rgba(0,0,0,0.06)"
                          />
                          <XAxis
                            dataKey="month"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid hsl(var(--border))",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                              fontSize: "12px",
                            }}
                            formatter={(
                              v: string | number | readonly (string | number)[] | undefined
                            ) => [formatINR(Number(v) || 0), ""]}
                          />
                          <Legend
                            wrapperStyle={{
                              paddingTop: "16px",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          />
                          <Bar
                            dataKey="expenses"
                            name="Expenses"
                            fill="#f43f5e"
                            radius={[4, 4, 0, 0]}
                            barSize={20}
                          />
                          <Bar
                            dataKey="sales"
                            name="Sales"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            barSize={20}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/20 rounded-xl border-2 border-dashed">
                        <LineChartIcon className="h-8 w-8 text-muted-foreground/40 mb-3" />
                        <p className="text-sm font-semibold text-muted-foreground">
                          No data to chart yet
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                          Log expenses or sales to see your performance trends.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Latest Photo Preview */}
                <Card className="shadow-sm border-border/50">
                  <CardHeader className="pb-3 px-6 flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-secondary" />
                        Latest Observation
                      </CardTitle>
                      <CardDescription>Most recent crop diary entry</CardDescription>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs font-bold bg-secondary/10 text-secondary border-secondary/20"
                    >
                      {photos ? `${photos.length} Photo${photos.length !== 1 ? "s" : ""}` : "…"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    {photos && photos.length > 0 ? (
                      <div className="space-y-4">
                        <div className="aspect-video relative rounded-xl overflow-hidden shadow-sm bg-black/5 ring-1 ring-border">
                          <img
                            src={photos[0].photoUrl}
                            alt={photos[0].caption || "Latest growth observation"}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
                            {photos[0].cropStage && (
                              <Badge className="bg-white/95 text-foreground border-none text-[9px] uppercase font-bold tracking-wider backdrop-blur-sm">
                                {photos[0].cropStage}
                              </Badge>
                            )}
                          </div>
                          <div className="absolute bottom-3 right-3">
                            <Badge className="bg-black/60 text-white border-none text-[9px] backdrop-blur-sm">
                              <CalendarIcon className="mr-1 h-2.5 w-2.5" />
                              {new Date(photos[0].takenAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </Badge>
                          </div>
                        </div>
                        {photos[0].caption && (
                          <p className="text-sm font-medium text-foreground line-clamp-2">
                            {photos[0].caption}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                        <ImageIcon className="h-7 w-7 mb-2 opacity-30" />
                        <p className="text-sm font-semibold">No photos yet</p>
                        <p className="text-xs mt-0.5">
                          Switch to the Photo Diary tab to add your first entry.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Tab 2: Expenses ── */}
              <TabsContent value="expenses" className="focus-visible:outline-none space-y-6">
                {/* Tab sub-header with actions */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold">Expense Tracking</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">All costs recorded for this crop cycle.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setBulkExpenseOpen(true)}>
                      <Layers className="h-3.5 w-3.5" /> Bulk Add
                    </Button>
                    <Button size="sm" className="gap-1.5 text-xs h-8 bg-[#1C4E35] hover:bg-[#163d29] text-white" onClick={() => setAddExpenseOpen(true)}>
                      <Plus className="h-3.5 w-3.5" /> Add Expense
                    </Button>
                  </div>
                </div>

                {/* Summary card + chart in a 2-col grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {expenseSummary ? (
                    <ExpenseSummaryCard summary={expenseSummary} />
                  ) : (
                    <div className="h-48 rounded-xl bg-muted/30 animate-pulse" />
                  )}
                  <div className="rounded-xl border border-border bg-card p-4">
                    {expenseSummary && Object.keys(expenseSummary.byCategory).length > 0 ? (
                      <ExpenseCategoryChart summaryData={expenseSummary} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground min-h-[160px]">
                        No expense data yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Full expense list */}
                <ExpenseList cropId={cropId} />

                {/* Add expense dialog */}
                <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
                    <AddExpenseForm cropId={cropId} onSuccess={() => setAddExpenseOpen(false)} />
                  </DialogContent>
                </Dialog>

                <BulkExpenseDialog
                  cropId={cropId}
                  open={bulkExpenseOpen}
                  onOpenChange={setBulkExpenseOpen}
                />
              </TabsContent>

              {/* ── Tab 3: Sales ── */}
              <TabsContent value="sales" className="focus-visible:outline-none space-y-6">
                {/* Tab header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold">Sales & Revenue</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Track buyers, weight sold, and market rates.</p>
                  </div>
                  <Button size="sm" className="gap-1.5 text-xs h-8 bg-[#1C4E35] hover:bg-[#163d29] text-white" onClick={() => setAddSaleOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Record Sale
                  </Button>
                </div>

                {/* Summary Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCardMini 
                    label="Total Revenue" 
                    value={formatINR(saleSummary?.totalRevenue || 0)} 
                    icon={<TrendingUp className="h-3 w-3 text-emerald-600" />} 
                  />
                  <StatCardMini 
                    label="Pending Amount" 
                    value={formatINR(saleSummary?.pendingAmount || 0)} 
                    icon={<Clock className="h-3 w-3 text-rose-500" />} 
                  />
                  <StatCardMini 
                    label="Sales Count" 
                    value={(saleSummary?.saleCount || 0).toString()} 
                    icon={<ShoppingCart className="h-3 w-3 text-blue-500" />} 
                  />
                  <StatCardMini 
                    label="Avg Rate / KG" 
                    value={`₹${(saleSummary?.averageRatePerKg || 0).toFixed(2)}`} 
                    icon={<BarChart3 className="h-3 w-3 text-purple-500" />} 
                  />
                </div>

                {/* Profit Waterfall Chart */}
                <Card className="shadow-sm border-border/50">
                  <CardHeader className="pb-3 px-6">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-secondary" />
                      Profit Flow
                    </CardTitle>
                    <CardDescription>Visualizing expenses vs sales and running profit</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80 w-full pt-2">
                    <ProfitWaterfallChart timelineEvents={profitTimeline} />
                  </CardContent>
                </Card>

                {/* Sale List */}
                <SaleList cropId={cropId} />

                {/* Add Sale Dialog */}
                <Dialog open={addSaleOpen} onOpenChange={setAddSaleOpen}>
                  <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Record Sale</DialogTitle></DialogHeader>
                    <AddSaleForm cropId={cropId} onSuccess={() => setAddSaleOpen(false)} />
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* ── Tab 4: Yield ── */}
              <TabsContent value="yield" className="focus-visible:outline-none">
                <PlaceholderTab
                  module="Yield Analytics"
                  description="Coming in Module 6. Visualize yield per acre, benchmark against market averages, and forecast revenue."
                  icon={<Wheat className="h-10 w-10 text-amber-400" />}
                />
              </TabsContent>

              {/* ── Tab 5: Photo Diary ── */}
              <TabsContent value="diary" className="focus-visible:outline-none">
                <CropPhotoDiary cropId={cropId} />
              </TabsContent>

              {/* ── Tab 6: Pest Log ── */}
              <TabsContent value="pest" className="focus-visible:outline-none">
                <PlaceholderTab
                  module="Pest & Disease Log"
                  description="Coming in Module 8. Identify pests and diseases, log treatments, and track crop health over time."
                  icon={<Bug className="h-10 w-10 text-orange-400" />}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <EditCropDialog
        crop={crop}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <MarkHarvestedDialog
        crop={crop}
        open={harvestOpen}
        onOpenChange={setHarvestOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete &ldquo;{crop.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This will permanently delete this crop cycle and all its associated records:
              </span>
              <span className="block text-foreground font-medium text-sm">
                • Expenses • Sales • Yields • Pest logs • Photo diary
              </span>
              <span className="block text-destructive font-semibold text-sm">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  colorClass,
  icon,
}: {
  label: string;
  value: string;
  colorClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`min-w-[170px] flex-1 rounded-2xl border p-4 shadow-sm flex flex-col items-center text-center gap-2 ${colorClass}`}
    >
      <div className="p-2 rounded-full bg-white/50 backdrop-blur-sm shadow-sm ring-1 ring-white/60">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 leading-none mb-1">
          {label}
        </p>
        <p className="text-lg font-extrabold tracking-tight leading-tight">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueClass = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs gap-2">
      <div className="flex items-center gap-2 text-muted-foreground font-medium shrink-0">
        <span className="opacity-60 shrink-0">{icon}</span>
        {label}
      </div>
      <span
        className={`font-semibold text-foreground text-right truncate max-w-[130px] ${valueClass}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function PlaceholderTab({
  module,
  description,
  icon,
  statLabel,
  statValue,
  statColorClass = "text-foreground",
}: {
  module: string;
  description: string;
  icon: React.ReactNode;
  statLabel?: string;
  statValue?: string;
  statColorClass?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 rounded-3xl bg-muted/20 border-2 border-dashed border-border/50 text-center gap-6">
      <div className="h-20 w-20 rounded-full bg-background flex items-center justify-center shadow-md ring-1 ring-border">
        {icon}
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-xl font-bold">{module}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {statLabel && statValue && (
        <div className="mt-4 p-6 bg-background/70 rounded-2xl border shadow-sm flex flex-col items-center min-w-[200px]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {statLabel}
          </p>
          <p className={`text-3xl font-black ${statColorClass}`}>{statValue}</p>
        </div>
      )}
    </div>
  );
}

function StatCardMini({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 space-y-1 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm font-bold truncate">{value}</p>
    </div>
  );
}

function CropDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b bg-background/80 px-4 py-4 max-w-7xl mx-auto space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-52" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-38" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>

      {/* Body skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="min-w-[170px] h-24 rounded-2xl flex-1" />
          ))}
        </div>
        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Skeleton className="h-[400px] rounded-2xl" />
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-12 rounded-xl w-full" />
            <Skeleton className="h-[300px] rounded-2xl w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-[200px] rounded-2xl" />
              <Skeleton className="h-[200px] rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
