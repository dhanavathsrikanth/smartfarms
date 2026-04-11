"use client";

import {
  Sprout,
  Droplets,
  Bug,
  Users,
  Waves,
  Wrench,
  Truck,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ExpenseCategory =
  | "seed"
  | "fertilizer"
  | "pesticide"
  | "labour"
  | "irrigation"
  | "equipment"
  | "transport"
  | "other";

interface CategoryMeta {
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
}

const CATEGORY_MAP: Record<ExpenseCategory, CategoryMeta> = {
  seed:       { icon: Sprout,        bg: "bg-green-100 dark:bg-green-900/30",   text: "text-green-700 dark:text-green-400",    border: "border-green-200 dark:border-green-800" },
  fertilizer: { icon: Droplets,      bg: "bg-teal-100 dark:bg-teal-900/30",    text: "text-teal-700 dark:text-teal-400",      border: "border-teal-200 dark:border-teal-800" },
  pesticide:  { icon: Bug,           bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400",  border: "border-orange-200 dark:border-orange-800" },
  labour:     { icon: Users,         bg: "bg-blue-100 dark:bg-blue-900/30",    text: "text-blue-700 dark:text-blue-400",      border: "border-blue-200 dark:border-blue-800" },
  irrigation: { icon: Waves,         bg: "bg-cyan-100 dark:bg-cyan-900/30",    text: "text-cyan-700 dark:text-cyan-400",      border: "border-cyan-200 dark:border-cyan-800" },
  equipment:  { icon: Wrench,        bg: "bg-gray-100 dark:bg-gray-800/50",    text: "text-gray-700 dark:text-gray-400",      border: "border-gray-200 dark:border-gray-700" },
  transport:  { icon: Truck,         bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  other:      { icon: MoreHorizontal, bg: "bg-muted",                           text: "text-muted-foreground",                 border: "border-border" },
};

interface ExpenseCategoryBadgeProps {
  category: ExpenseCategory | string;
  size?: "sm" | "lg";
  className?: string;
}

export function ExpenseCategoryBadge({
  category,
  size = "sm",
  className,
}: ExpenseCategoryBadgeProps) {
  const meta = CATEGORY_MAP[category as ExpenseCategory] ?? CATEGORY_MAP.other;
  const Icon = meta.icon;

  const label = category.charAt(0).toUpperCase() + category.slice(1);

  if (size === "lg") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-semibold",
          meta.bg,
          meta.text,
          meta.border,
          className
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="text-sm">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.bg,
        meta.text,
        meta.border,
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

/** Utility: get just the bg color string for a category (used by charts). */
export function getCategoryColor(category: string): string {
  const meta = CATEGORY_MAP[category as ExpenseCategory] ?? CATEGORY_MAP.other;
  // Return a hex-compatible color for recharts
  const colorMap: Record<string, string> = {
    seed:       "#16a34a",
    fertilizer: "#0d9488",
    pesticide:  "#ea580c",
    labour:     "#2563eb",
    irrigation: "#0891b2",
    equipment:  "#6b7280",
    transport:  "#9333ea",
    other:      "#94a3b8",
  };
  return colorMap[category] ?? "#94a3b8";
}
