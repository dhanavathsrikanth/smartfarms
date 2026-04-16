"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, IndianRupee, Percent, ArrowUpRight } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ProfitSummaryCardProps {
  totalProfit: number;
  margin: number;
  trend: number;
  loading?: boolean;
}

export function ProfitSummaryCard({ totalProfit, margin, trend, loading }: ProfitSummaryCardProps) {
  if (loading) {
    return (
      <Card className="overflow-hidden border-none bg-gradient-to-br from-[#1C4E35] to-[#143a28] text-white shadow-xl">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-4 w-32 bg-white/20 rounded" />
            <div className="h-12 w-48 bg-white/20 rounded" />
            <div className="flex gap-4">
              <div className="h-4 w-24 bg-white/20 rounded" />
              <div className="h-4 w-24 bg-white/20 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isProfit = totalProfit >= 0;

  return (
    <Card className="overflow-hidden border-none bg-gradient-to-br from-[#1C4E35] to-[#2D6A4F] text-white shadow-2xl relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <IndianRupee className="h-32 w-32 rotate-12" />
      </div>
      
      <CardContent className="p-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-emerald-200/80 text-xs font-bold uppercase tracking-[0.2em]">
              Net Earnings This Year
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                {formatINR(totalProfit)}
              </h2>
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                trend >= 0 ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/20 text-rose-300"
              )}>
                {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(Math.round(trend))}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-200/60">
                <Percent className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Margin</span>
              </div>
              <p className="text-xl font-bold">{margin.toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-200/60">
                {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="text-[10px] font-bold uppercase tracking-wider">Status</span>
              </div>
              <p className="text-xl font-bold">{isProfit ? "Profitable" : "In Loss"}</p>
            </div>
          </div>
        </div>

        {/* Shorthand Progress/Trend indicators could go here if needed */}
        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-[10px] text-emerald-200/50 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Real-time sync
            </span>
            <span className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> FY 2025-26
            </span>
          </div>
          <p className="italic">Excluding future projections</p>
        </div>
      </CardContent>
    </Card>
  );
}
