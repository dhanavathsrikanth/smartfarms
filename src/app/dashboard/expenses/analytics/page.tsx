"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, Authenticated, AuthLoading } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useStoreUserEffect } from "../../../../useStoreUserEffect";
import { formatINR } from "@/lib/utils";
import { ExpenseCategoryBadge } from "../../../components/expenses/ExpenseCategoryBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Calendar,
  BarChart3,
  Loader2,
  Info,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { FarmWithCropStats } from "@/types/farm";

// ─── Lazy-load the PDF download button (SSR-incompatible) ─────────────────────
const ExpenseReportDownloadButton = dynamic(
  () =>
    import("../../../components/expenses/ExpenseReportPDF").then(
      (m) => m.ExpenseReportDownloadButton
    ),
  { ssr: false, loading: () => <Button variant="outline" size="sm" disabled className="gap-1.5">Loading PDF…</Button> }
);

const ALL_CATEGORIES = [
  "seed", "fertilizer", "pesticide", "labour",
  "irrigation", "equipment", "transport", "other",
] as const;

// ─── Page shell ───────────────────────────────────────────────────────────────
export default function ExpenseAnalyticsPage() {
  useStoreUserEffect();
  return (
    <div className="min-h-screen bg-background">
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-secondary" />
        </div>
      </AuthLoading>
      <Authenticated>
        <AnalyticsContent />
      </Authenticated>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function AnalyticsContent() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [farmFilter, setFarmFilter] = useState<Id<"farms"> | "all">("all");

  const farms = useQuery(api.farms.listFarms) as FarmWithCropStats[] | undefined;

  // Current year summary
  const summaryYear = useQuery(api.expenses.getExpenseSummaryAllFarms, { year });
  // Previous year for YoY comparison
  const summaryPrevYear = useQuery(api.expenses.getExpenseSummaryAllFarms, { year: year - 1 });

  // Calendar heatmap data
  const calendarData = useQuery(api.expenses.getExpenseCalendarData, {
    year,
    ...(farmFilter !== "all" ? { farmId: farmFilter as Id<"farms"> } : {}),
  });

  // Report data for PDF
  const reportData = useQuery(api.expenses.generateExpenseReport, {
    year,
    ...(farmFilter !== "all" ? { farmId: farmFilter as Id<"farms"> } : {}),
  });

  // Farm comparison data — use all-time summary per farm
  const summaryAll = useQuery(api.expenses.getExpenseSummaryAllFarms, {});

  // Derived stats
  const stats = useMemo(() => {
    if (!summaryYear) return null;
    const totalSpent = summaryYear.totalExpenses;
    const monthlyAmounts = summaryYear.byMonth?.map((m) => m.totalAmount) ?? [];
    const mostExpensiveMonth = summaryYear.byMonth?.reduce(
      (best, m) => (m.totalAmount > (best?.totalAmount ?? 0) ? m : best),
      summaryYear.byMonth?.[0]
    );
    const biggestCategoryEntry = Object.entries(summaryYear.byCategory ?? {}).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const avgMonthly = monthlyAmounts.length > 0
      ? monthlyAmounts.reduce((s, v) => s + v, 0) / monthlyAmounts.length
      : 0;

    return { totalSpent, mostExpensiveMonth, biggestCategoryEntry, avgMonthly };
  }, [summaryYear]);

  // Category YoY comparison
  const categoryRows = useMemo(() => {
    const thisYear = summaryYear?.byCategory ?? {};
    const prevYear = summaryPrevYear?.byCategory ?? {};
    return ALL_CATEGORIES.map((cat) => {
      const thisAmt = thisYear[cat] ?? 0;
      const prevAmt = prevYear[cat] ?? 0;
      const yoyPct =
        prevAmt > 0
          ? (((thisAmt - prevAmt) / prevAmt) * 100).toFixed(1)
          : thisAmt > 0
          ? "+∞"
          : "0";
      const total = summaryYear?.totalExpenses ?? 1;
      return {
        category: cat,
        amount: thisAmt,
        pct: total > 0 ? ((thisAmt / total) * 100).toFixed(1) : "0",
        yoyPct,
        yoyUp: thisAmt >= prevAmt,
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [summaryYear, summaryPrevYear]);

  // Farm comparison bar chart data
  const farmChartData = useMemo(() => {
    return (
      summaryAll?.byFarm?.map((f) => ({
        name: f.farmName.length > 16 ? f.farmName.slice(0, 14) + "…" : f.farmName,
        total: f.totalExpenses,
        isPositive: f.totalExpenses < (summaryAll.totalExpenses / (summaryAll.byFarm?.length ?? 1)) * 1.5,
      })) ?? []
    );
  }, [summaryAll]);

  const availableYears = useMemo(() => {
    const years = new Set([currentYear, currentYear - 1]);
    summaryAll?.byMonth?.forEach((m) => years.add(m.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [summaryAll, currentYear]);

  const selectedFarmName = farms?.find((f) => f._id === farmFilter)?.name;
  const pdfFileName = `KhetSmart-Expenses-${selectedFarmName ?? "All-Farms"}-${year}.pdf`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/dashboard/expenses" className="hover:text-foreground transition-colors">Expenses</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Analytics</span>
      </nav>

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/expenses">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground -ml-2">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Expense Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Deep insights into your farm expenditure patterns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Farm filter */}
          <Select
            value={farmFilter as string}
            onValueChange={(v) => v && setFarmFilter(v === "all" ? "all" : (v as Id<"farms">))}
          >
            <SelectTrigger className="h-9 w-40 text-xs">
              <SelectValue placeholder="All Farms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Farms</SelectItem>
              {farms?.map((f) => (
                <SelectItem key={f._id} value={f._id} className="text-xs">{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year selector */}
          <Select value={String(year)} onValueChange={(v) => v && setYear(Number(v))}>
            <SelectTrigger className="h-9 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* PDF download */}
          {reportData ? (
            <ExpenseReportDownloadButton data={reportData} fileName={pdfFileName} />
          ) : (
            <Button variant="outline" size="sm" disabled className="gap-1.5">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </Button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — Year Overview Stats
      ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading icon={<BarChart3 className="h-4 w-4" />} title={`${year} Overview`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AnalyticsStatCard
            label="Total Spent"
            value={stats ? formatINR(stats.totalSpent) : "—"}
            loading={!stats}
            colorClass="text-rose-600"
            bgClass="bg-rose-50 dark:bg-rose-900/20"
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <AnalyticsStatCard
            label="Most Expensive Month"
            value={
              stats?.mostExpensiveMonth
                ? (() => {
                    const d = new Date(stats.mostExpensiveMonth.year, stats.mostExpensiveMonth.month - 1);
                    return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
                  })()
                : "—"
            }
            sub={stats?.mostExpensiveMonth ? formatINR(stats.mostExpensiveMonth.totalAmount) : undefined}
            loading={!stats}
            colorClass="text-orange-600"
            bgClass="bg-orange-50 dark:bg-orange-900/20"
            icon={<Calendar className="h-4 w-4" />}
          />
          <AnalyticsStatCard
            label="Biggest Category"
            loading={!stats}
            colorClass="text-amber-600"
            bgClass="bg-amber-50 dark:bg-amber-900/20"
            icon={<TrendingUp className="h-4 w-4" />}
            customContent={
              stats?.biggestCategoryEntry ? (
                <div className="flex flex-col gap-1 mt-1">
                  <ExpenseCategoryBadge category={stats.biggestCategoryEntry[0]} size="sm" />
                  <span className="text-xs font-mono font-bold">{formatINR(stats.biggestCategoryEntry[1])}</span>
                </div>
              ) : null
            }
          />
          <AnalyticsStatCard
            label="Avg Monthly Spend"
            value={stats ? formatINR(Math.round(stats.avgMonthly)) : "—"}
            loading={!stats}
            colorClass="text-violet-600"
            bgClass="bg-violet-50 dark:bg-violet-900/20"
            icon={<ArrowUpRight className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — Category Deep Dive
      ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading icon={<BarChart3 className="h-4 w-4" />} title="Category Deep Dive" />
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#1C4E35] text-white">
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider rounded-tl-xl">Category</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider">Total Amount</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Entries</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Avg / Entry</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">% of Total</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider rounded-tr-xl">vs Last Year</th>
                </tr>
              </thead>
              <tbody>
                {summaryYear === undefined ? (
                  [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : (
                  categoryRows.map((row, i) => {
                    const yoyNum = parseFloat(row.yoyPct);
                    const isUp = row.yoyPct === "+∞" || yoyNum > 0;
                    const isFlat = row.yoyPct === "0";
                    const entries = (summaryYear.byCategory ?? {})[row.category]
                      ? Math.round(row.amount / (Object.keys(summaryYear.byCategory ?? {}).length || 1))
                      : 0;

                    // Get entry count from raw API data
                    // We don't have count in getExpenseSummaryAllFarms, so derive from summary if possible
                    return (
                      <tr key={row.category} className={i % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/20 hover:bg-muted/40"}>
                        <td className="px-4 py-3">
                          <ExpenseCategoryBadge category={row.category} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-sm">
                          {row.amount > 0 ? formatINR(row.amount) : <span className="text-muted-foreground font-normal">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">—</td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">—</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1C4E35] rounded-full"
                                style={{ width: `${Math.min(100, parseFloat(row.pct))}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium tabular-nums w-10 text-right">
                              {row.amount > 0 ? `${row.pct}%` : "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isFlat || row.amount === 0 ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isUp ? "text-rose-600" : "text-emerald-600"}`}>
                              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {row.yoyPct === "+∞" ? "+∞" : `${isUp ? "+" : ""}${row.yoyPct}%`}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#1C4E35] text-white rounded-b-xl">
                  <td className="px-4 py-3 font-bold text-sm rounded-bl-xl">Total</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-sm">
                    {summaryYear ? formatINR(summaryYear.totalExpenses) : "—"}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell" />
                  <td className="px-4 py-3 hidden md:table-cell" />
                  <td className="px-4 py-3 text-right text-white/70 text-xs hidden sm:table-cell">100%</td>
                  <td className="px-4 py-3 rounded-br-xl" />
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — Farm Comparison
      ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading icon={<BarChart3 className="h-4 w-4" />} title="Farm Expense Comparison" />
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">All-time expense totals across your farms</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryAll === undefined ? (
              <div className="h-60 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : farmChartData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                No farm data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, farmChartData.length * 52)}>
                <BarChart
                  data={farmChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(v) => [formatINR(typeof v === "number" ? v : 0), "Total Expenses"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid hsl(var(--border))",
                      fontSize: "12px",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={28}>
                    {farmChartData.map((d, i) => (
                      <Cell key={i} fill={d.total > (summaryAll?.monthlyAverage ?? 0) * 3 ? "#e53e3e" : "#1C4E35"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — Expense Calendar Heatmap
      ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading icon={<Calendar className="h-4 w-4" />} title={`${year} Expense Heatmap`} />
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Info className="h-3.5 w-3.5" />
              Each cell represents one day. Hover to see details.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {calendarData === undefined ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ExpenseHeatmap year={year} data={calendarData} />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ─── Expense Heatmap (pure CSS/JS — no library) ───────────────────────────────

function ExpenseHeatmap({
  year,
  data,
}: {
  year: number;
  data: Record<string, { total: number; count: number }>;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number;
    date: string; total: number; count: number;
  } | null>(null);

  // Build 12 months, each with all days
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, mi) => {
      const monthNum = mi + 1;
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, di) => {
        const dd = String(di + 1).padStart(2, "0");
        const mm = String(monthNum).padStart(2, "0");
        const dateStr = `${year}-${mm}-${dd}`;
        const d = data[dateStr];
        return { dateStr, total: d?.total ?? 0, count: d?.count ?? 0 };
      });
      return {
        label: new Date(year, mi, 1).toLocaleString("en-IN", { month: "short" }),
        days,
      };
    });
  }, [year, data]);

  const cellColor = useCallback((total: number): string => {
    if (total === 0) return "bg-muted/40";
    if (total < 1000) return "bg-emerald-200 dark:bg-emerald-900";
    if (total < 5000) return "bg-emerald-400 dark:bg-emerald-700";
    return "bg-emerald-600 dark:bg-emerald-500";
  }, []);

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {["bg-muted/40", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600"].map((cls) => (
            <div key={cls} className={`h-4 w-4 rounded-sm ${cls}`} />
          ))}
        </div>
        <span>More</span>
        <span className="ml-4 text-muted-foreground/70">· &lt;₹1k · ₹1k–5k · &gt;₹5k</span>
      </div>

      {/* Grid */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {months.map((month) => (
          <div key={month.label} className="flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
              {month.label}
            </span>
            <div className="grid grid-cols-7 gap-[3px]">
              {month.days.map((day) => (
                <div
                  key={day.dateStr}
                  className={`h-4 w-4 rounded-sm cursor-pointer transition-all hover:scale-125 hover:ring-2 hover:ring-offset-1 hover:ring-foreground/30 ${cellColor(day.total)}`}
                  onMouseEnter={(e) => {
                    const r = (e.target as HTMLElement).getBoundingClientRect();
                    setTooltip({ x: r.left, y: r.top - 8, date: day.dateStr, total: day.total, count: day.count });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-popover border border-border rounded-xl shadow-xl px-3 py-2 text-xs -translate-y-full -translate-x-1/2"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-bold text-foreground mb-0.5">{tooltip.date}</p>
          {tooltip.total > 0 ? (
            <>
              <p className="text-muted-foreground">Total: <span className="font-mono font-semibold text-foreground">{formatINR(tooltip.total)}</span></p>
              <p className="text-muted-foreground">{tooltip.count} expense{tooltip.count !== 1 ? "s" : ""}</p>
            </>
          ) : (
            <p className="text-muted-foreground">No expenses</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
      <span className="text-[#1C4E35]">{icon}</span>
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
    </div>
  );
}

function AnalyticsStatCard({
  label, value, sub, icon, loading, colorClass, bgClass, customContent,
}: {
  label: string;
  value?: string;
  sub?: string;
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
            <div className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2 py-1 ${colorClass} ${bgClass}`}>
              {icon}
              <span className="uppercase tracking-wide text-[10px]">{label}</span>
            </div>
            {customContent ?? (
              <div>
                <p className="text-xl font-bold tracking-tight text-foreground font-mono">{value ?? "—"}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5 font-mono">{sub}</p>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
