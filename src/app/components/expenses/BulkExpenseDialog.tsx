"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ExpenseCategory } from "./ExpenseCategoryBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";

interface BulkExpenseDialogProps {
  cropId: Id<"crops">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BulkRow {
  id: number;
  category: ExpenseCategory | "";
  amount: string;
  date: string;
  supplier: string;
  notes: string;
}

const CATEGORIES: ExpenseCategory[] = [
  "seed",
  "fertilizer",
  "pesticide",
  "labour",
  "irrigation",
  "equipment",
  "transport",
  "other",
];

let rowIdCounter = 100;

function makeEmptyRow(date: string): BulkRow {
  return {
    id: rowIdCounter++,
    category: "",
    amount: "",
    date,
    supplier: "",
    notes: "",
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BulkExpenseDialog({
  cropId,
  open,
  onOpenChange,
}: BulkExpenseDialogProps) {
  const today = todayISO();
  const [rows, setRows] = useState<BulkRow[]>(() => [
    makeEmptyRow(today),
    makeEmptyRow(today),
    makeEmptyRow(today),
  ]);
  const [submitting, setSubmitting] = useState(false);

  const bulkCreate = useMutation(api.expenses.bulkCreateExpenses);

  const updateRow = (id: number, patch: Partial<BulkRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: number) => {
    setRows((prev) => {
      if (prev.length === 1) return prev; // keep at least 1
      return prev.filter((r) => r.id !== id);
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, makeEmptyRow(today)]);
  };

  // Running total (valid rows only)
  const validRows = rows.filter(
    (r) => r.category && parseFloat(r.amount) > 0
  );
  const runningTotal = validRows.reduce(
    (s, r) => s + parseFloat(r.amount),
    0
  );

  const handleSubmit = async () => {
    const toSubmit = rows
      .filter((r) => r.category && parseFloat(r.amount) > 0)
      .map((r) => ({
        category: r.category as ExpenseCategory,
        amount: parseFloat(r.amount),
        date: r.date,
        supplier: r.supplier || undefined,
        notes: r.notes || undefined,
      }));

    if (toSubmit.length === 0) {
      toast.error("Add at least one valid expense row");
      return;
    }

    setSubmitting(true);
    try {
      await bulkCreate({ cropId, expenses: toSubmit });
      toast.success(`${toSubmit.length} expense${toSubmit.length > 1 ? "s" : ""} added`);
      onOpenChange(false);
      // Reset
      setRows([makeEmptyRow(today), makeEmptyRow(today), makeEmptyRow(today)]);
    } catch {
      toast.error("Failed to save expenses");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Add Expenses</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add multiple expenses at once — great for recording a market trip. Empty rows are skipped automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Table */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-2 pr-1">
            {/* Header */}
            <div className="grid grid-cols-[160px_130px_130px_160px_1fr_32px] gap-2 px-1 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              <span>Category</span>
              <span>Amount (₹)</span>
              <span>Date</span>
              <span>Supplier</span>
              <span>Notes</span>
              <span />
            </div>

            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[160px_130px_130px_160px_1fr_32px] gap-2 items-center"
              >
                {/* Category */}
                <Select
                  value={row.category}
                  onValueChange={(v) =>
                    v && updateRow(row.id, { category: v as ExpenseCategory })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize text-xs">
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Amount */}
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                    ₹
                  </span>
                  <Input
                    inputMode="decimal"
                    placeholder="0"
                    value={row.amount}
                    onChange={(e) =>
                      updateRow(row.id, {
                        amount: e.target.value.replace(/[^0-9.]/g, ""),
                      })
                    }
                    className="h-9 pl-6 text-xs font-mono"
                  />
                </div>

                {/* Date */}
                <Input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(row.id, { date: e.target.value })}
                  className="h-9 text-xs"
                />

                {/* Supplier */}
                <Input
                  placeholder="Supplier…"
                  value={row.supplier}
                  onChange={(e) =>
                    updateRow(row.id, { supplier: e.target.value })
                  }
                  className="h-9 text-xs"
                />

                {/* Notes */}
                <Input
                  placeholder="Notes…"
                  value={row.notes}
                  onChange={(e) =>
                    updateRow(row.id, { notes: e.target.value })
                  }
                  className="h-9 text-xs"
                />

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add row */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addRow}
            className="mt-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </Button>
        </div>

        {/* Footer: total + submit */}
        <DialogFooter className="flex items-center justify-between border-t pt-4 mt-2 gap-4 sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Total:{" "}
              <span className="text-foreground font-bold font-mono">
                {formatINR(runningTotal)}
              </span>{" "}
              across{" "}
              <span className="text-foreground">{validRows.length}</span> item
              {validRows.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || validRows.length === 0}
              className="bg-[#1C4E35] hover:bg-[#163d29] text-white gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save {validRows.length > 0 ? validRows.length : ""} Expense{validRows.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
