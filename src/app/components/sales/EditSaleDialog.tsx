"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function EditSaleDialog({ sale, open, onOpenChange }: { sale: any, open: boolean, onOpenChange: (v: boolean) => void }) {
  const updateSale = useMutation(api.sales.updateSale);
  const [weight, setWeight] = useState(sale?.weight?.toString() || "");
  const [ratePerUnit, setRatePerUnit] = useState(sale?.ratePerUnit?.toString() || "");
  const [notes, setNotes] = useState(sale?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
    setIsSubmitting(true);
    try {
      await updateSale({
        saleId: sale._id,
        weight: parseFloat(weight) || undefined,
        ratePerUnit: parseFloat(ratePerUnit) || undefined,
        notes: notes || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if(!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Sale for {sale.buyerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Weight ({sale.weightUnit})</label>
            <Input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Rate</label>
            <Input type="number" step="0.01" value={ratePerUnit} onChange={(e) => setRatePerUnit(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full bg-[#1C4E35] hover:bg-[#163d29] text-white">
            {isSubmitting ? "Updating..." : "Update Sale"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
