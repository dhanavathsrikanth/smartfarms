"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { Store, User, FileSignature, MoreHorizontal, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AddSaleFormProps {
  cropId: Id<"crops">;
  onSuccess: () => void;
}

export function AddSaleForm({ cropId, onSuccess }: AddSaleFormProps) {
  const createSale = useMutation(api.sales.createSale);
  const buyers = useQuery(api.sales.listBuyers) || []; 

  const [saleType, setSaleType] = useState<string>("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "quintal" | "ton">("quintal");
  const [ratePerUnit, setRatePerUnit] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "pending">("paid");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [addAnother, setAddAnother] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numWeight = parseFloat(weight) || 0;
  const numRate = parseFloat(ratePerUnit) || 0;
  
  let weightInKg = numWeight;
  if(weightUnit === "quintal") weightInKg = numWeight * 100;
  if(weightUnit === "ton") weightInKg = numWeight * 1000;
  
  const totalAmountStr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(weightInKg * numRate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleType || !buyerName || numWeight <= 0 || numRate <= 0) return;

    setIsSubmitting(true);
    try {
      await createSale({
        cropId,
        saleType: saleType as any,
        buyerName,
        buyerContact: buyerContact || undefined,
        weight: numWeight,
        weightUnit,
        ratePerUnit: numRate,
        paymentStatus,
        date,
        notes: notes || undefined,
      });

      if (addAnother) {
        setWeight("");
        setRatePerUnit("");
        setNotes("");
      } else {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {[
          { id: "mandi", label: "Mandi", icon: Store },
          { id: "direct", label: "Direct", icon: User },
          { id: "contract", label: "Contract", icon: FileSignature },
          { id: "other", label: "Other", icon: MoreHorizontal },
        ].map((t) => {
          const Icon = t.icon;
          const isSel = saleType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSaleType(t.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
                isSel ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "hover:bg-muted"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Buyer Name</label>
          <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required list="buyer-suggestions" />
          <datalist id="buyer-suggestions">
            {buyers.map((b: any) => <option key={b._id} value={b.name} />)}
          </datalist>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Buyer Contact</label>
          <Input value={buyerContact} onChange={(e) => setBuyerContact(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Weight</label>
          <Input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} required min="0.01" />
        </div>
        <div className="space-y-1 col-span-2">
          <label className="text-sm font-medium">Unit</label>
          <div className="flex bg-muted p-1 rounded-lg">
            {["kg", "quintal", "ton"].map(u => (
              <button 
                key={u} type="button" 
                onClick={() => setWeightUnit(u as any)} 
                className={`flex-1 text-xs py-1.5 rounded-md capitalize font-medium ${weightUnit === u ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Rate per {weightUnit}</label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
          <Input type="number" step="0.01" className="pl-7" value={ratePerUnit} onChange={(e) => setRatePerUnit(e.target.value)} required min="0.01" />
        </div>
      </div>

      {numWeight > 0 && numRate > 0 && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200">
          <p className="text-sm font-medium mb-1">You will receive</p>
          <p className="text-2xl font-bold font-mono">{totalAmountStr}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Payment Status</label>
        <div className="flex gap-2">
          {[
            { id: "paid", label: "Paid", icon: CheckCircle, colors: "bg-emerald-50 text-emerald-700 border-emerald-600" },
            { id: "partial", label: "Partial", icon: AlertCircle, colors: "bg-amber-50 text-amber-700 border-amber-600" },
            { id: "pending", label: "Pending", icon: Clock, colors: "bg-rose-50 text-rose-700 border-rose-600" },
          ].map(s => {
            const Icon = s.icon;
            const isSel = paymentStatus === s.id;
            return (
              <button
                key={s.id} type="button"
                onClick={() => setPaymentStatus(s.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border text-sm font-semibold transition-colors ${
                  isSel ? s.colors : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" /> {s.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Notes</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input type="checkbox" id="addAnother" checked={addAnother} onChange={(e) => setAddAnother(e.target.checked)} className="rounded border-gray-300" />
        <label htmlFor="addAnother" className="text-sm font-medium">Add another sale after saving</label>
      </div>

      <Button type="submit" disabled={isSubmitting || !saleType || !buyerName || numWeight <= 0 || numRate <= 0} className="w-full bg-[#1C4E35] hover:bg-[#163d29] text-white">
        {isSubmitting ? "Saving..." : "Record Sale"}
      </Button>
    </form>
  );
}
