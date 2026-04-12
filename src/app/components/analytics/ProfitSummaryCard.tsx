"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react";

interface ProfitSummaryCardProps {
  grossProfit: number;
  totalRevenue: number;
  totalExpenses: number;
  profitMargin: number;
  roiPercent?: number;
  additionalMetric?: {
    label: string;
    value: string | number;
  };
  title?: string;
  className?: string;
}

export function ProfitSummaryCard({
  grossProfit,
  totalRevenue,
  totalExpenses,
  profitMargin,
  roiPercent,
  additionalMetric,
  title = "Profitability Overview",
  className = "",
}: ProfitSummaryCardProps) {
  const isProfit = grossProfit >= 0;
  
  // Calculate relative widths for the stacked bar
  const totalFinancials = totalRevenue + totalExpenses;
  const revenueWidth = totalFinancials > 0 ? (totalRevenue / totalFinancials) * 100 : 50;
  const expenseWidth = totalFinancials > 0 ? (totalExpenses / totalFinancials) * 100 : 50;

  return (
    <Card className={`shadow-sm border-border/50 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            {title}
          </div>
          {roiPercent !== undefined && (
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${isProfit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              ROI: {roiPercent.toFixed(1)}%
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Top Stats */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Gross {isProfit ? 'Profit' : 'Loss'}
            </p>
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-black ${isProfit ? 'text-emerald-600' : 'text-rose-500'}`}>
                {formatINR(Math.abs(grossProfit))}
              </span>
              <div className={`flex items-center justify-center h-6 w-6 rounded-full ${isProfit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
            </div>
          </div>

          <div className="text-right space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Margin
            </p>
            <p className="text-2xl font-bold">
              {profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Stacked Revenue vs Expense Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-1">
            <span>Expenses {formatINR(totalExpenses)}</span>
            <span>Revenue {formatINR(totalRevenue)}</span>
          </div>
          
          <div className="h-4 w-full rounded-full overflow-hidden flex bg-muted">
            <div 
              className="h-full bg-rose-400 transition-all duration-500" 
              style={{ width: `${expenseWidth}%` }}
              title={`Expenses: ${formatINR(totalExpenses)}`}
            />
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${revenueWidth}%` }}
              title={`Revenue: ${formatINR(totalRevenue)}`}
            />
          </div>
        </div>

        {/* Additional Metric Optional Slot */}
        {additionalMetric && (
          <div className="pt-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Wallet className="h-4 w-4" />
              {additionalMetric.label}
            </div>
            <p className="text-sm font-bold">{additionalMetric.value}</p>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
