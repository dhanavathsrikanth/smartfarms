"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ExpenseCard, ExpenseItem } from "./ExpenseCard";
import { AddExpenseForm } from "./AddExpenseForm";
import { BulkExpenseDialog } from "./BulkExpenseDialog";
import { formatINR } from "@/lib/utils";
import { format } from "date-fns";
import { Receipt, Plus, SlidersHorizontal, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExpenseListProps {
  cropId?: Id<"crops">;
  farmId?: Id<"farms">;
}

type SortOption = "newest" | "oldest" | "highest" | "lowest";

const CATEGORIES = [
  "seed",
  "fertilizer",
  "pesticide",
  "labour",
  "irrigation",
  "equipment",
  "transport",
  "other",
] as const;

const PAGE_SIZE = 20;

export function ExpenseList({ cropId, farmId }: ExpenseListProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Choose query based on props
  const byCropRaw = useQuery(
    api.expenses.listExpensesByCrop,
    cropId ? { cropId } : "skip"
  );
  const byFarmRaw = useQuery(
    api.expenses.listExpensesByFarm,
    farmId && !cropId ? { farmId } : "skip"
  );
  const allRaw = useQuery(
    api.expenses.listAllExpenses,
    !cropId && !farmId ? {} : "skip"
  );

  const rawExpenses = (cropId ? byCropRaw : farmId ? byFarmRaw : allRaw) as
    | ExpenseItem[]
    | undefined;

  const isLoading = rawExpenses === undefined;

  // Apply client-side filters and sort
  const filtered = useMemo(() => {
    if (!rawExpenses) return [];
    let result = [...rawExpenses];

    if (categoryFilter !== "all") {
      result = result.filter((e) => e.category === categoryFilter);
    }
    if (startDate) result = result.filter((e) => e.date >= startDate);
    if (endDate) result = result.filter((e) => e.date <= endDate);

    result.sort((a, b) => {
      switch (sort) {
        case "newest":
          return b.date.localeCompare(a.date);
        case "oldest":
          return a.date.localeCompare(b.date);
        case "highest":
          return b.amount - a.amount;
        case "lowest":
          return a.amount - b.amount;
      }
    });
    return result;
  }, [rawExpenses, categoryFilter, startDate, endDate, sort]);

  // Summary stats
  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);
  const avgAmount = filtered.length ? totalAmount / filtered.length : 0;

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<string, ExpenseItem[]>();
    for (const e of filtered) {
      const key = e.date.slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: format(new Date(key + "-01"), "MMMM yyyy"),
      total: items.reduce((s, e) => s + e.amount, 0),
      items,
    }));
  }, [filtered]);

  const visibleGroups = useMemo(() => {
    let count = 0;
    const result = [];
    for (const group of grouped) {
      const remaining = PAGE_SIZE * page - count;
      if (remaining <= 0) break;
      result.push({
        ...group,
        items: group.items.slice(0, remaining),
        hasMore: group.items.length > remaining,
      });
      count += Math.min(group.items.length, remaining);
    }
    return result;
  }, [grouped, page]);

  const totalShown = visibleGroups.reduce((s, g) => s + g.items.length, 0);
  const hasMore = totalShown < filtered.length;

  // ──────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
        </div>

        <Select value={categoryFilter} onValueChange={(v) => v && setCategoryFilter(v)}>
          <SelectTrigger className="h-9 w-40 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-36 text-xs"
            placeholder="From"
          />
          <span className="text-muted-foreground text-xs">–</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-36 text-xs"
            placeholder="To"
          />
        </div>

        <Select value={sort} onValueChange={(v) => v && setSort(v as SortOption)}>
          <SelectTrigger className="h-9 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="highest">Highest Amount</SelectItem>
            <SelectItem value="lowest">Lowest Amount</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {cropId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkOpen(true)}
              className="h-9 gap-1.5 text-xs"
            >
              <Layers className="h-3.5 w-3.5" />
              Bulk Add
            </Button>
          )}
          {cropId && (
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="h-9 gap-1.5 text-xs bg-[#1C4E35] hover:bg-[#163d29] text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total</p>
            <p className="text-sm font-bold text-foreground font-mono">{formatINR(totalAmount)}</p>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Entries</p>
            <p className="text-sm font-bold text-foreground">{filtered.length}</p>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Average</p>
            <p className="text-sm font-bold text-foreground font-mono">{formatINR(avgAmount)}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl bg-card/20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-bold">No expenses recorded yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Start tracking your crop expenses to get a clear picture of your farming costs.
          </p>
          {cropId && (
            <Button
              className="mt-6 gap-2 bg-[#1C4E35] hover:bg-[#163d29] text-white"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add First Expense
            </Button>
          )}
        </div>
      )}

      {/* Grouped expense list */}
      <div className="space-y-8">
        {visibleGroups.map((group) => (
          <div key={group.key}>
            {/* Month header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground">{group.label}</h3>
              <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                {formatINR(group.total)}
              </span>
            </div>

            <div className="space-y-2">
              {group.items.map((expense) => (
                <ExpenseCard key={expense._id} expense={expense} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            className="gap-2"
          >
            Load More ({filtered.length - totalShown} remaining)
          </Button>
        </div>
      )}

      {/* Add Expense Dialog */}
      {cropId && (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <AddExpenseForm
              cropId={cropId}
              onSuccess={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Expense Dialog */}
      {cropId && (
        <BulkExpenseDialog
          cropId={cropId}
          open={bulkOpen}
          onOpenChange={setBulkOpen}
        />
      )}
    </div>
  );
}
