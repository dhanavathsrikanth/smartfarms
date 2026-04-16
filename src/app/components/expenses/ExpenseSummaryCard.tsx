"use client";

import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import { formatINR } from "@/lib/utils";
import { format } from "date-fns";
import { Receipt, TrendingDown, Hash, Star, BarChart3 } from "lucide-react";

interface LargestExpense {
  category: string;
  amount: number;
  date: string;
}

interface SummaryData {
  totalAmount: number;
  byCategory: Record<string, { total: number; count: number }>;
  expenseCount: number;
  largestExpense: LargestExpense | null;
  averageExpenseAmount: number;
  mostExpensiveCategory: string | null;
}

interface ExpenseSummaryCardProps {
  summary: SummaryData;
}

function StatRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="mt-0.5 h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold leading-none mb-0.5">
          {label}
        </p>
        <div className="text-sm font-semibold text-foreground">{children}</div>
      </div>
    </div>
  );
}

export function ExpenseSummaryCard({ summary }: ExpenseSummaryCardProps) {
  const {
    totalAmount,
    expenseCount,
    mostExpensiveCategory,
    largestExpense,
    averageExpenseAmount,
  } = summary;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Left accent border */}
      <div className="flex">
        <div className="w-1 shrink-0 bg-gradient-to-b from-orange-400 via-red-500 to-rose-600" />

        <div className="flex-1 p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground leading-none">
                Expense Summary
              </p>
              <p className="text-xl font-bold font-mono text-foreground leading-tight">
                {formatINR(totalAmount)}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div>
            <StatRow icon={Hash} label="Total Entries">
              <span>{expenseCount} expense{expenseCount !== 1 ? "s" : ""} recorded</span>
            </StatRow>

            <StatRow icon={Star} label="Top Category">
              {mostExpensiveCategory ? (
                <ExpenseCategoryBadge category={mostExpensiveCategory} size="sm" />
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </StatRow>

            <StatRow icon={TrendingDown} label="Largest Single Expense">
              {largestExpense ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{formatINR(largestExpense.amount)}</span>
                  <ExpenseCategoryBadge category={largestExpense.category} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {(() => {
                      try {
                        return format(new Date(largestExpense.date), "d MMM yyyy");
                      } catch {
                        return largestExpense.date;
                      }
                    })()}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </StatRow>

            <StatRow icon={BarChart3} label="Average per Expense">
              <span className="font-mono">{formatINR(averageExpenseAmount)}</span>
            </StatRow>
          </div>
        </div>
      </div>
    </div>
  );
}
