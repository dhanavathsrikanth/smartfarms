"use client";

import { useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { ExpenseItem } from "./ExpenseCard";
import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  CalendarDays,
  Tag,
  FileText,
} from "lucide-react";

interface ExpensePhotoViewerProps {
  /** The primary expense whose photo is shown first */
  expense: ExpenseItem;
  /** Other expenses in the same crop — used for prev/next navigation */
  relatedExpenses?: ExpenseItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpensePhotoViewer({
  expense,
  relatedExpenses = [],
  open,
  onOpenChange,
}: ExpensePhotoViewerProps) {
  // Build the list of expenses with photos (include the primary one)
  const withPhotos = [
    expense,
    ...relatedExpenses.filter(
      (e) => e._id !== expense._id && !!e.photoUrl
    ),
  ].filter((e) => !!e.photoUrl);

  const [idx, setIdx] = useState(
    Math.max(
      withPhotos.findIndex((e) => e._id === expense._id),
      0
    )
  );

  const current = withPhotos[idx] ?? expense;
  const canPrev = idx > 0;
  const canNext = idx < withPhotos.length - 1;

  const handleDownload = () => {
    if (!current.photoUrl) return;
    const a = document.createElement("a");
    a.href = current.photoUrl;
    a.download = `expense-photo-${current._id}.jpg`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const formattedDate = (() => {
    try {
      return format(new Date(current.date), "d MMMM yyyy");
    } catch {
      return current.date;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <ExpenseCategoryBadge category={current.category} />
            <span className="text-sm font-bold font-mono">
              {formatINR(current.amount)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {withPhotos.length > 1 && (
              <span className="text-xs text-muted-foreground">
                {idx + 1} / {withPhotos.length}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image */}
        <div className="relative bg-black/5 dark:bg-black/40 flex items-center justify-center min-h-[300px] max-h-[55vh]">
          {current.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.photoUrl}
              alt="Expense photo"
              className="max-h-[55vh] max-w-full object-contain"
            />
          ) : (
            <div className="text-muted-foreground text-sm">No photo attached</div>
          )}

          {/* Prev / Next */}
          {canPrev && (
            <button
              onClick={() => setIdx((i) => i - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {canNext && (
            <button
              onClick={() => setIdx((i) => i + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Details */}
        <div className="px-4 py-3 space-y-2 border-t border-border">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <ExpenseCategoryBadge category={current.category} />
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{formattedDate}</span>
            </div>
            {current.supplier && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="font-medium">Supplier:</span>
                <span>{current.supplier}</span>
              </div>
            )}
          </div>
          {current.notes && (
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p className="italic">{current.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
