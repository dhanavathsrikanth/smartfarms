"use client";

import { formatINR } from "@/lib/utils";
import type { FarmStats } from "@/types/farm";
import { TrendingUp, TrendingDown, Sprout, ShoppingCart, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface FarmStatsBarProps {
  stats: FarmStats;
  className?: string;
}

export function FarmStatsBar({ stats, className }: FarmStatsBarProps) {
  const isProfitable = stats.totalProfit >= 0;

  const pills = [
    {
      label: "Total Expenses",
      value: formatINR(stats.totalExpenses),
      icon: <Wallet className="h-3.5 w-3.5" />,
      valueClass: "text-foreground",
      bgClass: "bg-muted/60",
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground",
    },
    {
      label: "Total Sales",
      value: formatINR(stats.totalSales),
      icon: <ShoppingCart className="h-3.5 w-3.5" />,
      valueClass: "text-foreground",
      bgClass: "bg-muted/60",
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground",
    },
    {
      label: "Net Profit",
      value: formatINR(stats.totalProfit),
      icon: isProfitable ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" />
      ),
      valueClass: isProfitable ? "text-emerald-600 font-bold" : "text-rose-500 font-bold",
      bgClass: isProfitable
        ? "bg-emerald-50 border border-emerald-100"
        : "bg-rose-50 border border-rose-100",
      iconBg: isProfitable ? "bg-emerald-100" : "bg-rose-100",
      iconColor: isProfitable ? "text-emerald-600" : "text-rose-500",
    },
    {
      label: "Active Crops",
      value: `${stats.activeCropsCount} / ${stats.totalCropsCount}`,
      icon: <Sprout className="h-3.5 w-3.5" />,
      valueClass: "text-secondary font-bold",
      bgClass: "bg-secondary/5 border border-secondary/20",
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary",
    },
  ];

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {pills.map((pill) => (
        <div
          key={pill.label}
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3 min-w-[160px] flex-1",
            pill.bgClass
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              pill.iconBg,
              pill.iconColor
            )}
          >
            {pill.icon}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-1">
              {pill.label}
            </p>
            <p className={cn("text-sm leading-none", pill.valueClass)}>{pill.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FarmStatsBarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl px-4 py-3 min-w-[160px] flex-1 bg-muted/50"
        >
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
