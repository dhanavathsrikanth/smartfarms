"use client";

import { useState, useMemo } from "react";
import { useQuery, Authenticated, AuthLoading } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useStoreUserEffect } from "../../../useStoreUserEffect";
import {
  ExpenseCategoryBadge,
  ExpenseCategoryChart,
  ExpenseTrendChart,
  ExpenseList,
  AddExpenseForm,
} from "../../components/expenses";
import { BulkExpenseDialog } from "../../components/expenses/BulkExpenseDialog";
import { ExpenseInsightsPanel } from "../../components/expenses/ExpenseInsightsPanel";
import { formatINR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Receipt,
  Plus,
  Layers,
  ChevronRight,
  TrendingDown,
  Hash,
  Star,
  ShieldAlert,
  Loader2,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { FarmWithCropStats } from "@/types/farm";
import dynamic from "next/dynamic";

const ExpenseReportDownloadButton = dynamic(
  () => import("../../components/expenses/ExpenseReportPDF").then((m) => m.ExpenseReportDownloadButton),
  { ssr: false, loading: () => null }
);

export default function ExpensesPage() {
  useStoreUserEffect();

  return (
    <div className="min-h-screen bg-background">
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-secondary" />
        </div>
      </AuthLoading>
      <Authenticated>
        <ExpensesContent />
      </Authenticated>
      {/* Unauthenticated guard */}
      <div className="hidden">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center p-8">
          <ShieldAlert className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Please sign in to view expenses.</p>
          <Link href="/"><Button>Return to Home</Button></Link>
        </div>
      </div>
    </div>
  );
}

function ExpensesContent() {
  const currentYear = new Date().getFullYear();

  const [farmFilter, setFarmFilter] = useState<Id<"farms"> | "all">("all");
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedCropId, setSelectedCropId] = useState<Id<"crops"> | null>(null);

  // Data fetches
  const farms = useQuery(api.farms.listFarms) as FarmWithCropStats[] | undefined;
  const summaryAll = useQuery(api.expenses.getExpenseSummaryAllFarms, {});
  const summaryYear = useQuery(api.expenses.getExpenseSummaryAllFarms, { year: currentYear });

  // Farm-scoped summary (when farm filter active)
  const farmSummary = useQuery(
    api.expenses.getExpenseSummaryByFarm,
    farmFilter !== "all" ? { farmId: farmFilter as Id<"farms">, year: yearFilter } : "skip"
  );

  // Report data for PDF download (respects current filters)
  const reportData = useQuery(api.expenses.generateExpenseReport, {
    ...(farmFilter !== "all" ? { farmId: farmFilter as Id<"farms"> } : {}),
    ...(yearFilter !== undefined ? { year: yearFilter } : {}),
  });

  // Derive available year options from byMonth data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    summaryAll?.byMonth?.forEach((m) => years.add(m.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [summaryAll, currentYear]);

  // Active summary (farm-scoped or all-farms)
  const activeSummary = farmFilter !== "all" ? farmSummary : summaryAll;
  const isLoadingSummary = activeSummary === undefined;

  // Chart data — use activeSummary.byMonth for trend chart
  const trendData = (summaryAll?.byMonth ?? []).map((m) => ({
    month: m.month,
    year: m.year,
    totalAmount: m.totalAmount,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Expenses</span>
      </nav>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Receipt className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">All Expenses</h1>
              {summaryAll !== undefined && (
                <Badge className="bg-muted text-muted-foreground border-border text-xs">
                  {summaryAll.byFarm?.reduce((s, f) => s + f.totalExpenses, 0) > 0
                    ? `${summaryAll.byCategory ? Object.values(summaryAll.byCategory).length : 0} categories`
                    : "No expenses yet"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track, analyze, and manage all your farm expenditures.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/expenses/analytics">
            <Button variant="outline" size="sm" className="gap-1.5">
              <BarChart3 className="h-4 w-4" /> Analytics
            </Button>
          </Link>
          {reportData && (
            <ExpenseReportDownloadButton
              data={reportData}
              fileName={`KhetSmart-Expenses-${farmFilter !== "all" ? (farms?.find((f) => f._id === farmFilter)?.name ?? "Farm") : "All-Farms"}-${summaryYear ? new Date().getFullYear() : "all"}.pdf`}
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkOpen(true)}
            className="gap-1.5"
          >
            <Layers className="h-4 w-4" />
            Bulk Add
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="gap-1.5 bg-[#1C4E35] hover:bg-[#163d29] text-white"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* ── Summary Bar (4 stat cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStatCard
          label="Total Expenses"
          value={summaryAll ? formatINR(summaryAll.totalExpenses) : "—"}
          icon={<TrendingDown className="h-4 w-4" />}
          loading={summaryAll === undefined}
          colorClass="text-rose-600"
          bgClass="bg-rose-50 dark:bg-rose-900/20"
        />
        <SummaryStatCard
          label={`${currentYear} Expenses`}
          value={summaryYear ? formatINR(summaryYear.totalExpenses) : "—"}
          icon={<Receipt className="h-4 w-4" />}
          loading={summaryYear === undefined}
          colorClass="text-orange-600"
          bgClass="bg-orange-50 dark:bg-orange-900/20"
        />
        <SummaryStatCard
          label="Top Category"
          loading={summaryAll === undefined}
          icon={<Star className="h-4 w-4" />}
          colorClass="text-amber-600"
          bgClass="bg-amber-50 dark:bg-amber-900/20"
          customContent={
            summaryAll?.byCategory && Object.keys(summaryAll.byCategory).length > 0 ? (
              <div className="flex flex-col gap-1 mt-1">
                <ExpenseCategoryBadge
                  category={
                    Object.entries(summaryAll.byCategory).sort((a, b) => b[1].total - a[1].total)[0]?.[0] ?? "other"
                  }
                  size="sm"
                />
                <span className="text-xs font-mono font-bold text-foreground">
                  {formatINR(
                    Object.entries(summaryAll.byCategory).sort((a, b) => b[1].total - a[1].total)[0]?.[1].total ?? 0
                  )}
                </span>
              </div>
            ) : null
          }
        />
        <SummaryStatCard
          label="Total Entries"
          value={
            summaryAll
              ? String(
                  (summaryAll.byCategory
                    ? Object.keys(summaryAll.byCategory).length
                    : 0)
                )
              : "—"
          }
          icon={<Hash className="h-4 w-4" />}
          loading={summaryAll === undefined}
          colorClass="text-blue-600"
          bgClass="bg-blue-50 dark:bg-blue-900/20"
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Expense by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="h-52 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeSummary && activeSummary.byCategory && Object.keys(activeSummary.byCategory).length > 0 ? (
              <ExpenseCategoryChart
                summaryData={{
                  totalAmount: (activeSummary as { totalExpenses?: number; totalAmount?: number }).totalExpenses
                    ?? (activeSummary as { totalExpenses?: number; totalAmount?: number }).totalAmount
                    ?? 0,
                  byCategory: activeSummary.byCategory,
                  expenseCount: (activeSummary as { expenseCount?: number }).expenseCount ?? 0,
                }}
              />
            ) : (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                No expense data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryAll === undefined ? (
              <div className="h-52 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ExpenseTrendChart monthlyData={trendData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Insights Panel ── */}
      <ExpenseInsightsPanel
        farmId={farmFilter !== "all" ? (farmFilter as Id<"farms">) : undefined}
      />

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Filters
        </p>
        {/* Farm filter */}
        <Select
          value={farmFilter as string}
          onValueChange={(v) => v && setFarmFilter(v === "all" ? "all" : (v as Id<"farms">))}
        >
          <SelectTrigger className="h-9 w-44 text-xs">
            <SelectValue placeholder="All Farms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Farms</SelectItem>
            {farms?.map((f) => (
              <SelectItem key={f._id} value={f._id} className="text-xs">
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year filter */}
        <Select
          value={yearFilter ? String(yearFilter) : "all"}
          onValueChange={(v) => v && setYearFilter(v === "all" ? undefined : Number(v))}
        >
          <SelectTrigger className="h-9 w-36 text-xs">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)} className="text-xs">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Expense List ── */}
      <ExpenseList
        farmId={farmFilter !== "all" ? (farmFilter as Id<"farms">) : undefined}
      />

      {/* ── Add Expense Dialog (pick crop first) ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          {selectedCropId ? (
            <AddExpenseForm
              cropId={selectedCropId}
              onSuccess={() => {
                setAddOpen(false);
                setSelectedCropId(null);
              }}
            />
          ) : (
            <CropPickerForExpense
              onSelect={(id) => setSelectedCropId(id)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Bulk Add (needs cropId — show crop picker first) ── */}
      {selectedCropId && (
        <BulkExpenseDialog
          cropId={selectedCropId}
          open={bulkOpen}
          onOpenChange={(open) => {
            setBulkOpen(open);
            if (!open) setSelectedCropId(null);
          }}
        />
      )}
      {!selectedCropId && bulkOpen && (
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Select a Crop for Bulk Add</DialogTitle>
            </DialogHeader>
            <CropPickerForExpense
              onSelect={(id) => {
                setSelectedCropId(id);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Inline crop picker for the global expense page ──────────────────────────

function CropPickerForExpense({ onSelect }: { onSelect: (id: Id<"crops">) => void }) {
  const crops = useQuery(api.crops.listAllCrops);

  if (crops === undefined) {
    return (
      <div className="space-y-2 py-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    );
  }

  const activeCrops = crops.filter((c) => c.status === "active");

  if (activeCrops.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No active crops found. Add a crop first to record expenses.
      </p>
    );
  }

  return (
    <div className="space-y-2 py-2">
      <p className="text-xs text-muted-foreground mb-3">Select the crop this expense belongs to:</p>
      {activeCrops.map((crop) => (
        <button
          key={crop._id}
          onClick={() => onSelect(crop._id)}
          className="w-full text-left flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 hover:border-primary/30 transition-all"
        >
          <div>
            <p className="text-sm font-semibold">{crop.name}</p>
            <p className="text-xs text-muted-foreground">{(crop as { farmName?: string }).farmName}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

// ─── Summary Stat Card ────────────────────────────────────────────────────────

function SummaryStatCard({
  label,
  value,
  icon,
  loading,
  colorClass,
  bgClass,
  customContent,
}: {
  label: string;
  value?: string;
  icon: React.ReactNode;
  loading?: boolean;
  colorClass: string;
  bgClass: string;
  customContent?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-6 w-28 bg-muted rounded" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${colorClass} ${bgClass} rounded-lg px-2 py-1`}>
              {icon}
              <span className="font-semibold uppercase tracking-wide text-[10px]">{label}</span>
            </div>
            {customContent ?? (
              <p className="text-xl font-bold tracking-tight text-foreground font-mono">{value}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
