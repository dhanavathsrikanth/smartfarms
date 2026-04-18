"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ExpenseCategory } from "./ExpenseCategoryBadge";
import {
  Sprout,
  Droplets,
  Bug,
  Users,
  Waves,
  Wrench,
  Truck,
  MoreHorizontal,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CategoryOption {
  value: ExpenseCategory;
  label: string;
  icon: React.ElementType;
  bg: string;
  activeBg: string;
  activeText: string;
}

const CATEGORIES: CategoryOption[] = [
  { value: "seed",       label: "Seed",       icon: Sprout,         bg: "hover:bg-green-50 dark:hover:bg-green-900/20",   activeBg: "bg-green-100 dark:bg-green-900/40 border-green-400",   activeText: "text-green-700 dark:text-green-400" },
  { value: "fertilizer", label: "Fertilizer", icon: Droplets,       bg: "hover:bg-teal-50 dark:hover:bg-teal-900/20",    activeBg: "bg-teal-100 dark:bg-teal-900/40 border-teal-400",     activeText: "text-teal-700 dark:text-teal-400" },
  { value: "pesticide",  label: "Pesticide",  icon: Bug,            bg: "hover:bg-orange-50 dark:hover:bg-orange-900/20", activeBg: "bg-orange-100 dark:bg-orange-900/40 border-orange-400", activeText: "text-orange-700 dark:text-orange-400" },
  { value: "labour",     label: "Labour",     icon: Users,          bg: "hover:bg-blue-50 dark:hover:bg-blue-900/20",    activeBg: "bg-blue-100 dark:bg-blue-900/40 border-blue-400",     activeText: "text-blue-700 dark:text-blue-400" },
  { value: "irrigation", label: "Irrigation", icon: Waves,          bg: "hover:bg-cyan-50 dark:hover:bg-cyan-900/20",    activeBg: "bg-cyan-100 dark:bg-cyan-900/40 border-cyan-400",     activeText: "text-cyan-700 dark:text-cyan-400" },
  { value: "equipment",  label: "Equipment",  icon: Wrench,         bg: "hover:bg-gray-50 dark:hover:bg-gray-800/30",    activeBg: "bg-gray-100 dark:bg-gray-800/60 border-gray-400",     activeText: "text-gray-700 dark:text-gray-300" },
  { value: "transport",  label: "Transport",  icon: Truck,          bg: "hover:bg-purple-50 dark:hover:bg-purple-900/20", activeBg: "bg-purple-100 dark:bg-purple-900/40 border-purple-400", activeText: "text-purple-700 dark:text-purple-400" },
  { value: "other",      label: "Other",      icon: MoreHorizontal, bg: "hover:bg-muted/50",                              activeBg: "bg-muted border-muted-foreground/40",                   activeText: "text-foreground" },
];

interface AddExpenseFormProps {
  cropId: Id<"crops">;
  onSuccess?: () => void;
  /** Pre-filled values for edit mode (used by EditExpenseDialog) */
  defaultValues?: {
    category?: ExpenseCategory;
    amount?: number;
    date?: string;
    notes?: string;
    supplier?: string;
    photoUrl?: string;
  };
  submitLabel?: string;
  onSubmit?: (values: FormValues) => Promise<void>;
}

export interface FormValues {
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
  supplier?: string;
  photoUrl?: string | null; // null means explicitly removed
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatIndianAmount(value: string): string {
  const num = parseFloat(value.replace(/,/g, ""));
  if (isNaN(num)) return value;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(num);
}

export function AddExpenseForm({
  cropId,
  onSuccess,
  defaultValues,
  submitLabel = "Save Expense",
  onSubmit: externalSubmit,
}: AddExpenseFormProps) {
  const [category, setCategory] = useState<ExpenseCategory | "">(
    defaultValues?.category ?? ""
  );
  const [amount, setAmount] = useState(
    defaultValues?.amount ? String(defaultValues.amount) : ""
  );
  const [displayAmount, setDisplayAmount] = useState(
    defaultValues?.amount
      ? formatIndianAmount(String(defaultValues.amount))
      : ""
  );
  const [date, setDate] = useState(defaultValues?.date ?? todayISO());
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [supplier, setSupplier] = useState(defaultValues?.supplier ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    defaultValues?.photoUrl ?? null
  );
  // null = explicitly removed, undefined = untouched, string = existing URL or new storageId
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null | undefined>(
    defaultValues?.photoUrl ?? undefined
  );
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addAnother, setAddAnother] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createExpense = useMutation(api.expenses.createExpense);
  const generateUploadUrl = useMutation(
    api.expenses.generateExpensePhotoUploadUrl
  );
  const attachPhoto = useMutation(api.expenses.attachExpensePhoto);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!category) errs.category = "Please select a category";
    const num = parseFloat(amount.replace(/,/g, ""));
    if (!amount || isNaN(num) || num <= 0)
      errs.amount = "Enter a valid amount greater than 0";
    if (!date) errs.date = "Date is required";
    return errs;
  }, [category, amount, date]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoRemoved(false);
    setUploadedPhotoUrl(undefined); // will be set at submit time
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);

    const num = parseFloat(amount.replace(/,/g, ""));

    try {
      // Upload photo at submit time if a new file was selected
      let finalPhotoUrl: string | null | undefined = uploadedPhotoUrl;
      if (photoFile) {
        setUploading(true);
        try {
          const uploadUrl = await generateUploadUrl();
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": photoFile.type },
            body: photoFile,
          });
          if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
          const { storageId } = await res.json();
          finalPhotoUrl = storageId;
        } catch (err) {
          toast.error("Photo upload failed — saving expense without photo");
          finalPhotoUrl = undefined;
        } finally {
          setUploading(false);
        }
      } else if (photoRemoved) {
        finalPhotoUrl = null; // explicitly removed
      }

      if (externalSubmit) {
        await externalSubmit({
          category: category as ExpenseCategory,
          amount: num,
          date,
          notes: notes || undefined,
          supplier: supplier || undefined,
          photoUrl: finalPhotoUrl,
        });
      } else {
        const expenseId = await createExpense({
          cropId,
          category: category as ExpenseCategory,
          amount: num,
          date,
          notes: notes || undefined,
          supplier: supplier || undefined,
        });

        // Attach photo if a new storageId was generated
        if (finalPhotoUrl && !finalPhotoUrl.startsWith("http")) {
          await attachPhoto({
            expenseId,
            storageId: finalPhotoUrl as Id<"_storage">,
          });
        }

        toast.success("Expense saved!");
      }

      if (addAnother) {
        setCategory("");
        setAmount("");
        setDisplayAmount("");
        setDate(todayISO());
        setNotes("");
        setSupplier("");
        setPhotoPreview(null);
        setPhotoFile(null);
        setUploadedPhotoUrl(undefined);
        setPhotoRemoved(false);
      } else {
        onSuccess?.();
      }
    } catch (err) {
      toast.error("Failed to save expense");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Category grid */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
          Category <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  setCategory(cat.value);
                  setErrors((e) => ({ ...e, category: "" }));
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all duration-150 cursor-pointer",
                  isActive
                    ? cn(cat.activeBg, cat.activeText, "border-2 scale-[1.04] shadow-sm")
                    : cn("border-border bg-card text-muted-foreground", cat.bg)
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && cat.activeText)} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
        {errors.category && (
          <p className="mt-1 text-xs text-destructive">{errors.category}</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <Label htmlFor="amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Amount <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground select-none">
            ₹
          </span>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="0"
            value={displayAmount}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9.]/g, "");
              setAmount(raw);
              setDisplayAmount(raw);
              setErrors((err) => ({ ...err, amount: "" }));
            }}
            onBlur={() => {
              if (amount) setDisplayAmount(formatIndianAmount(amount));
            }}
            className={cn("pl-7", errors.amount && "border-destructive")}
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-xs text-destructive">{errors.amount}</p>
        )}
      </div>

      {/* Date */}
      <div>
        <Label htmlFor="date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setErrors((err) => ({ ...err, date: "" }));
          }}
          className={cn(errors.date && "border-destructive")}
        />
        {errors.date && (
          <p className="mt-1 text-xs text-destructive">{errors.date}</p>
        )}
      </div>

      {/* Supplier */}
      <div>
        <Label htmlFor="supplier" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Supplier / Vendor <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="supplier"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="e.g. Ram Seeds Store, Local Labour"
        />
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any details about this expense..."
          className="resize-none"
        />
      </div>

      {/* Photo upload */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Attach Photo <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="flex flex-col gap-2">
          {photoPreview ? (
            <div className="relative inline-block w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Preview"
                className="h-24 w-24 rounded-xl object-cover border border-border"
              />
              <button
                type="button"
                onClick={() => {
                  setPhotoPreview(null);
                  setPhotoFile(null);
                  setUploadedPhotoUrl(undefined);
                  setPhotoRemoved(true);
                }}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow z-10"
              >
                <X className="h-3 w-3" />
              </button>
              {uploading && (
                <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center z-10">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
          ) : null}
          
          <div className={cn(photoPreview ? "mt-2" : "")}>
            <input
              id="photo-upload-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <label
              htmlFor="photo-upload-input"
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              Upload receipt / photo
            </label>
            </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-1 border-t">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={addAnother}
            onChange={(e) => setAddAnother(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span className="text-xs text-muted-foreground">Add Another</span>
        </label>

        <Button
          type="submit"
          disabled={submitting || uploading}
          className="bg-[#1C4E35] hover:bg-[#163d29] text-white gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
