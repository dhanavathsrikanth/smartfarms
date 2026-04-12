"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export function PaymentUpdateDialog({ sale, open, onOpenChange }: { sale: any, open: boolean, onOpenChange: (v: boolean) => void }) {
  const updatePaymentStatus = useMutation(api.sales.updatePaymentStatus);
  const [status, setStatus] = useState<"paid"|"partial"|"pending">(sale?.paymentStatus || "pending");
  const [partialAmount, setPartialAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if(!sale) return;
    setIsSubmitting(true);
    try {
      await updatePaymentStatus({
        saleId: sale._id,
        paymentStatus: status,
        partialAmountReceived: status === "partial" ? parseFloat(partialAmount) : undefined
      });
      toast.success("Payment status updated successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update payment status");
    } finally {
      setIsSubmitting(false);
    }
  };

  if(!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-center">Update status for <span className="font-bold">{sale.buyerName}</span> (Total: ₹{sale.totalAmount.toLocaleString()})</p>
          <div className="grid gap-2">
            <Button variant={status === "paid" ? "default" : "outline"} className={status === "paid" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""} onClick={() => setStatus("paid")}>
              <CheckCircle className="w-4 h-4 mr-2" /> Mark Fully Paid
            </Button>
            <Button variant={status === "partial" ? "default" : "outline"} className={status === "partial" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""} onClick={() => setStatus("partial")}>
              <AlertCircle className="w-4 h-4 mr-2" /> Partial Payment
            </Button>
            <Button variant={status === "pending" ? "default" : "outline"} className={status === "pending" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""} onClick={() => setStatus("pending")}>
              <Clock className="w-4 h-4 mr-2" /> Still Pending
            </Button>
          </div>
          {status === "partial" && (
            <div className="pt-2">
              <label className="text-sm font-medium">Amount received so far (₹)</label>
              <Input type="number" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} className="mt-1" />
            </div>
          )}
          <Button onClick={handleSubmit} disabled={isSubmitting || (status === "partial" && !partialAmount)} className="w-full mt-4 bg-[#1C4E35] text-white hover:bg-[#163d29]">
            {isSubmitting ? "Updating..." : "Update Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
