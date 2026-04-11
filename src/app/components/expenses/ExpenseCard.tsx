"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ExpenseCategoryBadge, ExpenseCategory } from "./ExpenseCategoryBadge";
import { ExpensePhotoViewer } from "./ExpensePhotoViewer";
import { EditExpenseDialog } from "./EditExpenseDialog";
import { formatINR } from "@/lib/utils";
import { format } from "date-fns";
import { Pencil, Trash2, ImageIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";


export interface ExpenseItem {
  _id: Id<"expenses">;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
  supplier?: string;
  photoUrl?: string;
  cropName?: string;
  farmName?: string;
  cropId: Id<"crops">;
  farmId: Id<"farms">;
  userId: string;
  createdAt: number;
}

interface ExpenseCardProps {
  expense: ExpenseItem;
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const deleteExpense = useMutation(api.expenses.deleteExpense);

  const handleDelete = async () => {
    try {
      await deleteExpense({ expenseId: expense._id });
      toast.success("Expense deleted");
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  const formattedDate = (() => {
    try {
      return format(new Date(expense.date), "d MMM yyyy");
    } catch {
      return expense.date;
    }
  })();

  const truncatedNotes =
    expense.notes && expense.notes.length > 60
      ? expense.notes.slice(0, 60) + "…"
      : expense.notes;

  return (
    <>
      <div className="group flex items-start gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-border/80">
        {/* Left: badge */}
        <div className="shrink-0 pt-0.5">
          <ExpenseCategoryBadge category={expense.category} size="lg" />
        </div>

        {/* Center: amount + details */}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xl font-bold tracking-tight text-foreground leading-none">
            {formatINR(expense.amount)}
          </p>
          {expense.supplier && (
            <p className="mt-1 text-xs text-muted-foreground font-medium truncate">
              {expense.supplier}
            </p>
          )}
          {truncatedNotes && (
            <p className="mt-0.5 text-xs text-muted-foreground italic truncate">
              {truncatedNotes}
            </p>
          )}
          {(expense.cropName || expense.farmName) && (
            <p className="mt-1 text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">
              {[expense.cropName, expense.farmName].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Right: date + photo thumbnail + actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {formattedDate}
          </span>

          {/* Photo thumbnail */}
          {expense.photoUrl && (
            <button
              onClick={() => setPhotoOpen(true)}
              className="h-10 w-10 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/40 transition-all"
              title="View photo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={expense.photoUrl}
                alt="Expense photo"
                className="h-full w-full object-cover"
              />
            </button>
          )}
          {!expense.photoUrl && (
            <div className="h-10 w-10 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-50 transition-opacity">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditOpen(true)}
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>

            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <button
                    className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the{" "}
                    <strong>{formatINR(expense.amount)}</strong>{" "}
                    {expense.category} expense
                    {expense.photoUrl ? " and its attached photo" : ""}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {photoOpen && (
        <ExpensePhotoViewer
          expense={expense}
          open={photoOpen}
          onOpenChange={setPhotoOpen}
        />
      )}
      <EditExpenseDialog
        expense={expense}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
