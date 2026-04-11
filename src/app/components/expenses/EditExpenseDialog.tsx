"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ExpenseItem } from "./ExpenseCard";
import { ExpenseCategory } from "./ExpenseCategoryBadge";
import { AddExpenseForm, FormValues } from "./AddExpenseForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface EditExpenseDialogProps {
  expense: ExpenseItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditExpenseDialog({
  expense,
  open,
  onOpenChange,
}: EditExpenseDialogProps) {
  const updateExpense = useMutation(api.expenses.updateExpense);
  const attachPhoto = useMutation(api.expenses.attachExpensePhoto);

  const handleSubmit = async (values: FormValues) => {
    if (!expense) return;
    try {
      await updateExpense({
        expenseId: expense._id,
        category: values.category,
        amount: values.amount,
        date: values.date,
        notes: values.notes,
        supplier: values.supplier,
      });

      // Attach new photo if storageId was provided (not a URL)
      if (
        values.photoUrl &&
        !values.photoUrl.startsWith("http") &&
        values.photoUrl !== expense.photoUrl
      ) {
        await attachPhoto({
          expenseId: expense._id,
          storageId: values.photoUrl as Id<"_storage">,
        });
      }

      toast.success("Expense updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update expense");
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update the details for this expense record.
          </DialogDescription>
        </DialogHeader>

        <AddExpenseForm
          cropId={expense.cropId}
          defaultValues={{
            category: expense.category as ExpenseCategory,
            amount: expense.amount,
            date: expense.date,
            notes: expense.notes,
            supplier: expense.supplier,
            photoUrl: expense.photoUrl,
          }}
          submitLabel="Update Expense"
          onSubmit={handleSubmit}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
