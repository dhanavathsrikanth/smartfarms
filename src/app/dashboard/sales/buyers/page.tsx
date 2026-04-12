"use client";

import { useQuery, Authenticated } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { formatINR } from "@/lib/utils";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BuyerList } from "@/app/components/sales/BuyerList";
import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// We'll create a CreateBuyerForm inline for now to fulfill the requirement for a "+ Add Buyer" button
import { useMutation } from "convex/react";

function CreateBuyerForm({ onSuccess }: { onSuccess: () => void }) {
  const createBuyer = useMutation(api.sales.createBuyer);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [buyerType, setBuyerType] = useState<any>("trader");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !buyerType) return;
    setIsSubmitting(true);
    try {
      await createBuyer({ name, contact: contact || undefined, buyerType });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Buyer Name</label>
        <input 
          className="w-full h-10 px-3 rounded-xl border focus:ring-2 focus:ring-emerald-500 outline-none" 
          value={name} onChange={e => setName(e.target.value)} required 
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Contact Number</label>
        <input 
          className="w-full h-10 px-3 rounded-xl border focus:ring-2 focus:ring-emerald-500 outline-none" 
          value={contact} onChange={e => setContact(e.target.value)} 
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Buyer Type</label>
        <select 
          className="w-full h-10 px-3 rounded-xl border focus:ring-2 focus:ring-emerald-500 outline-none" 
          value={buyerType} onChange={e => setBuyerType(e.target.value as any)}
        >
          <option value="trader">Trader</option>
          <option value="mandi">Mandi</option>
          <option value="company">Company</option>
          <option value="retailer">Retailer</option>
          <option value="direct_consumer">Direct Consumer</option>
          <option value="exporter">Exporter</option>
          <option value="other">Other</option>
        </select>
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full bg-[#1C4E35] text-white hover:bg-[#163d29]">
        {isSubmitting ? "Saving..." : "Create Buyer"}
      </Button>
    </form>
  )
}

export default function BuyersPage() {
  return (
    <Authenticated>
      <BuyersContent />
    </Authenticated>
  );
}

function BuyersContent() {
  const buyers = useQuery(api.sales.listBuyers) || [];
  const [addOpen, setAddOpen] = useState(false);

  const stats = {
    total: buyers.length,
    revenue: buyers.reduce((s, b) => s + (b.totalAmountPaid || 0) + (b.totalAmountPending || 0), 0),
    avgReliability: buyers.length > 0 ? buyers.reduce((s, b) => s + (b.reliabilityScore || 0), 0) / buyers.length : 0,
    pending: buyers.reduce((s, b) => s + (b.totalAmountPending || 0), 0),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground font-medium mb-1">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/dashboard/sales" className="hover:text-foreground">Sales</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Buyers</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight">My Buyers</h1>
        </div>
        <Button className="bg-[#1C4E35] hover:bg-[#163d29] text-white gap-2 h-10" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Buyer
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BuyerStatCard label="Total Buyers" value={stats.total.toString()} icon={<Users className="h-4 w-4" />} />
        <BuyerStatCard label="Total Revenue" value={formatINR(stats.revenue)} icon={<TrendingUp className="h-4 w-4" />} />
        <BuyerStatCard label="Avg Reliability" value={`${Math.round(stats.avgReliability)}%`} icon={<Clock className="h-4 w-4" />} />
        <BuyerStatCard label="Total Pending" value={formatINR(stats.pending)} icon={<AlertCircle className="h-4 w-4" />} color="text-rose-600" />
      </div>

      <BuyerList />

      {/* ── Add Buyer Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Buyer</DialogTitle>
          </DialogHeader>
          <CreateBuyerForm onSuccess={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BuyerStatCard({ label, value, icon, color = "text-foreground" }: { label: string, value: string, icon: any, color?: string }) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1.5">{label}</p>
          <p className={`text-xl font-extrabold tracking-tight ${color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
