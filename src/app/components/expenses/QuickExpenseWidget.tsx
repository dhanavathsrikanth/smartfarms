"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sprout, Droplets, Users, MoreHorizontal, X, Check, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { FarmWithCropStats } from "@/types/farm";

// ─── Quick categories — most used ─────────────────────────────────────────────
const QUICK_CATEGORIES = [
  {
    id: "seed",
    label: "Seed",
    icon: <Sprout className="h-5 w-5" />,
    color: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400",
    activeColor: "bg-emerald-500 text-white border-emerald-600",
  },
  {
    id: "fertilizer",
    label: "Fertilizer",
    icon: <Droplets className="h-5 w-5" />,
    color: "bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400",
    activeColor: "bg-teal-500 text-white border-teal-600",
  },
  {
    id: "labour",
    label: "Labour",
    icon: <Users className="h-5 w-5" />,
    color: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400",
    activeColor: "bg-blue-500 text-white border-blue-600",
  },
  {
    id: "other",
    label: "Other",
    icon: <MoreHorizontal className="h-5 w-5" />,
    color: "bg-muted hover:bg-muted/80 border-border text-muted-foreground",
    activeColor: "bg-foreground text-background border-foreground",
  },
] as const;

type QuickCategory = (typeof QUICK_CATEGORIES)[number]["id"];

export function QuickExpenseWidget() {
  const [selectedCategory, setSelectedCategory] = useState<QuickCategory | null>(null);
  const [farmId, setFarmId] = useState<Id<"farms"> | "">("");
  const [cropId, setCropId] = useState<Id<"crops"> | "">("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const farms = useQuery(api.farms.listFarms) as FarmWithCropStats[] | undefined;
  const crops = useQuery(
    api.crops.listCropsByFarm,
    farmId ? { farmId: farmId as Id<"farms"> } : "skip"
  );
  const createExpense = useMutation(api.expenses.createExpense);

  // Auto-focus amount when drawer opens
  useEffect(() => {
    if (selectedCategory) {
      setTimeout(() => amountRef.current?.focus(), 120);
    }
  }, [selectedCategory]);

  // Reset crop when farm changes
  useEffect(() => {
    setCropId("");
  }, [farmId]);

  // If only one farm — auto-select it
  useEffect(() => {
    if (farms?.length === 1 && !farmId) {
      setFarmId(farms[0]._id);
    }
  }, [farms, farmId]);

  const activeCrops = crops?.filter((c) => c.status === "active") ?? [];

  const canSave = selectedCategory && cropId && amount && parseFloat(amount) > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const id = await createExpense({
        cropId: cropId as Id<"crops">,
        category: selectedCategory,
        amount: parseFloat(amount),
        date,
      });
      toast.success("Expense saved!", {
        description: `₹${parseFloat(amount).toLocaleString("en-IN")} recorded for ${selectedCategory}`,
      });
      // Reset
      setSelectedCategory(null);
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
    } catch (err) {
      toast.error("Failed to save expense");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-dashed border-2 border-[#1C4E35]/20 bg-gradient-to-br from-[#1C4E35]/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          Quick Expense
          <span className="text-[10px] font-normal text-muted-foreground ml-1">Log in &lt;10 sec</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ── Category buttons ── */}
        <div className="grid grid-cols-4 gap-2">
          {QUICK_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 font-medium text-xs
                  transition-all duration-150 select-none active:scale-95
                  ${isActive ? cat.activeColor : cat.color}
                `}
              >
                {cat.icon}
                <span className="leading-none">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Slide-open form ── */}
        {selectedCategory && (
          <div className="rounded-xl border border-border bg-card p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {QUICK_CATEGORIES.find((c) => c.id === selectedCategory)?.label} Expense
              </p>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Farm */}
            {(farms?.length ?? 0) > 1 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Farm</Label>
                <Select value={farmId as string} onValueChange={(v) => v && setFarmId(v as Id<"farms">)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select farm…" />
                  </SelectTrigger>
                  <SelectContent>
                    {farms?.map((f) => (
                      <SelectItem key={f._id} value={f._id} className="text-xs">{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Crop */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Crop</Label>
              <Select
                value={cropId as string}
                onValueChange={(v) => v && setCropId(v as Id<"crops">)}
                disabled={!farmId}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={farmId ? "Select crop…" : "Select farm first"} />
                </SelectTrigger>
                <SelectContent>
                  {activeCrops.map((c) => (
                    <SelectItem key={c._id} value={c._id} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount + Date row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Amount (₹)</Label>
                <Input
                  ref={amountRef}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="w-full h-9 bg-[#1C4E35] hover:bg-[#163d29] text-white gap-2 mt-1"
              size="sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save Expense"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
