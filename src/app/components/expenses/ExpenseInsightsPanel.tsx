"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { formatINR } from "@/lib/utils";
import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  Store,
  CalendarClock,
  Lightbulb,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface Props {
  farmId?: Id<"farms">;
}

export function ExpenseInsightsPanel({ farmId }: Props) {
  const [open, setOpen] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const insights = useQuery(api.expenses.getExpenseInsights, {
    ...(farmId ? { farmId } : {}),
  });

  const hasInsights =
    insights &&
    (insights.categorySpike !== null ||
      insights.unusualExpense !== null ||
      (insights.missingCategories?.length ?? 0) > 0 ||
      insights.topSupplier !== null ||
      (insights.expenseForecast?.estimatedRemainingAmount ?? 0) > 0);

  return (
    <Card className="border-l-4 border-l-amber-400 dark:border-l-amber-500">
      {/* ── Header ── */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            💡 Expense Insights
            {insights && hasInsights && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-none text-[10px] h-4 px-1.5">
                {[
                  insights.categorySpike ? 1 : 0,
                  insights.unusualExpense ? 1 : 0,
                  insights.missingCategories?.length ?? 0,
                  insights.topSupplier ? 1 : 0,
                  (insights.expenseForecast?.estimatedRemainingAmount ?? 0) > 0 ? 1 : 0,
                ].reduce((a, b) => a + b, 0)} new
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setRefreshKey((k) => k + 1)}
              title="Refresh insights"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 space-y-3">
          {/* Loading */}
          {insights === undefined && (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Analysing your expenses…</span>
            </div>
          )}

          {/* No insights */}
          {insights !== undefined && !hasInsights && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center rounded-xl bg-muted/20 border border-dashed border-border">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">Your expenses look balanced.</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Keep recording to unlock deeper insights about spending patterns and anomalies.
              </p>
            </div>
          )}

          {/* ── a) Category Spike ── */}
          {insights?.categorySpike && (
            <InsightCard
              icon={<TrendingUp className="h-4 w-4 text-rose-500" />}
              badgeColor="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
              badgeLabel="Spending Spike"
              headline={`${capitalize(insights.categorySpike.category)} costs up ${insights.categorySpike.percentIncrease}% vs last year`}
              description={`You spent ${formatINR(insights.categorySpike.thisYear)} on ${capitalize(insights.categorySpike.category)} this year, compared to ${formatINR(insights.categorySpike.lastYear)} last year. This ${insights.categorySpike.percentIncrease}% increase may be worth reviewing.`}
              action={
                <Link href="/dashboard/expenses/analytics">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    View Analytics →
                  </Button>
                </Link>
              }
            />
          )}

          {/* ── b) Unusual Expense ── */}
          {insights?.unusualExpense && (
            <InsightCard
              icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
              badgeColor="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
              badgeLabel="Unusual Amount"
              headline={`A ${capitalize(insights.unusualExpense.category)} expense is 2× above average`}
              description={`On ${formatDate(insights.unusualExpense.date)}, an expense of ${formatINR(insights.unusualExpense.amount)} was recorded — more than double the average ${formatINR(insights.unusualExpense.average)} for ${capitalize(insights.unusualExpense.category)}. Verify this is correct.`}
              action={
                <Link href="/dashboard/expenses">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    Review Expense →
                  </Button>
                </Link>
              }
            />
          )}

          {/* ── c) Missing Categories ── */}
          {insights?.missingCategories && insights.missingCategories.length > 0 && (
            <InsightCard
              icon={<ClipboardList className="h-4 w-4 text-blue-500" />}
              badgeColor="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              badgeLabel="Possibly Unlogged"
              headline={`${insights.missingCategories.length} active crop${insights.missingCategories.length > 1 ? "s" : ""} missing essential expenses`}
              description={
                <span>
                  {insights.missingCategories.slice(0, 3).map((m, i) => (
                    <span key={i} className="inline-flex items-center gap-1 mr-1.5">
                      <span className="font-semibold">{m.cropName}</span> has no{" "}
                      <ExpenseCategoryBadge category={m.missingCategory} size="sm" /> logged
                      {i < Math.min(insights.missingCategories.length, 3) - 1 ? ";" : "."}
                    </span>
                  ))}
                  {insights.missingCategories.length > 3 && (
                    <span className="text-muted-foreground">
                      {" "}+{insights.missingCategories.length - 3} more.
                    </span>
                  )}
                </span>
              }
            />
          )}

          {/* ── d) Top Supplier ── */}
          {insights?.topSupplier && (
            <InsightCard
              icon={<Store className="h-4 w-4 text-violet-500" />}
              badgeColor="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              badgeLabel="Top Supplier"
              headline={`${insights.topSupplier.supplierName} is your biggest supplier`}
              description={`You've spent ${formatINR(insights.topSupplier.totalAmount)} across ${insights.topSupplier.transactionCount} transaction${insights.topSupplier.transactionCount > 1 ? "s" : ""} with ${insights.topSupplier.supplierName}. Consider negotiating a bulk discount given your purchase volume.`}
            />
          )}

          {/* ── e) Expense Forecast ── */}
          {insights?.expenseForecast && insights.expenseForecast.estimatedRemainingAmount > 0 && (
            <InsightCard
              icon={<CalendarClock className="h-4 w-4 text-teal-500" />}
              badgeColor="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
              badgeLabel="Forecast"
              headline={`Estimated ${formatINR(insights.expenseForecast.estimatedRemainingAmount)} remaining this year`}
              description={`Based on last year's pattern (total ${formatINR(insights.expenseForecast.lastYearTotal)}), you've spent ${formatINR(insights.expenseForecast.currentYearToDate)} so far this year. Forecast remaining spend until year-end: ${formatINR(insights.expenseForecast.estimatedRemainingAmount)}.`}
              action={
                <Link href="/dashboard/expenses/analytics">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    Full Analytics →
                  </Button>
                </Link>
              }
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InsightCard({
  icon,
  badgeColor,
  badgeLabel,
  headline,
  description,
  action,
}: {
  icon: React.ReactNode;
  badgeColor: string;
  badgeLabel: string;
  headline: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2 hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${badgeColor}`}>
              {badgeLabel}
            </span>
          </div>
          <p className="text-sm font-semibold leading-snug text-foreground">{headline}</p>
          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</div>
        </div>
      </div>
      {action && <div className="pl-7">{action}</div>}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}
