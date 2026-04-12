"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { ShoppingCart, Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SaleCard } from "./SaleCard";
import { AddSaleForm } from "./AddSaleForm";
import { EditSaleDialog } from "./EditSaleDialog";
import { PaymentUpdateDialog } from "./PaymentUpdateDialog";

interface SaleListProps {
  cropId?: Id<"crops">;
  farmId?: Id<"farms">;
  year?: number;
}

export function SaleList({ cropId, farmId, year }: SaleListProps) {
  const [saleTypeFilter, setSaleTypeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [updatingPayment, setUpdatingPayment] = useState<any>(null);

  const byCrop = useQuery(api.sales.listSalesByCrop, cropId ? { cropId } : "skip");
  const byFarm = useQuery(api.sales.listSalesByFarm, farmId && !cropId ? { farmId, year } : "skip");
  const allSales = useQuery(api.sales.listAllSales, !cropId && !farmId ? { year } : "skip");

  const rawSales = cropId ? byCrop : farmId ? byFarm : allSales;
  const isLoading = rawSales === undefined;

  const filtered = useMemo(() => {
    if (!rawSales) return [];
    let res = [...rawSales];

    if (saleTypeFilter !== "all") res = res.filter(s => s.saleType === saleTypeFilter);
    if (paymentFilter !== "all") res = res.filter(s => s.paymentStatus === paymentFilter);
    if (startDate) res = res.filter(s => s.date >= startDate);
    if (endDate) res = res.filter(s => s.date <= endDate);

    res.sort((a, b) => {
      if (sort === "newest") return b.date.localeCompare(a.date);
      if (sort === "oldest") return a.date.localeCompare(b.date);
      if (sort === "highest") return b.totalAmount - a.totalAmount;
      if (sort === "lowest") return a.totalAmount - b.totalAmount;
      return 0;
    });

    return res;
  }, [rawSales, saleTypeFilter, paymentFilter, startDate, endDate, sort]);

  const totalRevenue = filtered.filter(s => s.paymentStatus !== "pending").reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPending = filtered.filter(s => s.paymentStatus !== "paid").reduce((sum, s) => sum + s.totalAmount, 0);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const s of filtered) {
      const key = s.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).map(([k, items]) => ({
      key: k,
      label: format(new Date(k + "-01"), "MMMM yyyy"),
      total: items.reduce((sum, s) => sum + s.totalAmount, 0),
      items,
    }));
  }, [filtered]);

  const PAGE_SIZE = 20;
  const visibleGroups = useMemo(() => {
    let count = 0;
    const res = [];
    for (const g of grouped) {
      const rem = PAGE_SIZE * page - count;
      if (rem <= 0) break;
      res.push({ ...g, items: g.items.slice(0, rem) });
      count += Math.min(g.items.length, rem);
    }
    return res;
  }, [grouped, page]);

  const totalShown = visibleGroups.reduce((sum, g) => sum + g.items.length, 0);
  const hasMore = totalShown < filtered.length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
        </div>

        <Select value={saleTypeFilter} onValueChange={(val) => val && setSaleTypeFilter(val)}>
          <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="mandi">Mandi</SelectItem>
            <SelectItem value="direct">Direct</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={(val) => val && setPaymentFilter(val)}>
          <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-36 text-xs" />
          <span className="text-xs text-muted-foreground">–</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-36 text-xs" />
        </div>

        <Select value={sort} onValueChange={(val) => val && setSort(val)}>
          <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="highest">Highest Amount</SelectItem>
            <SelectItem value="lowest">Lowest Amount</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          {cropId && (
            <Button onClick={() => setAddOpen(true)} className="h-9 gap-1.5 text-xs bg-[#1C4E35] hover:bg-[#163d29] text-white">
              <Plus className="h-3.5 w-3.5" /> Record Sale
            </Button>
          )}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-6 rounded-xl border bg-muted/20 px-4 py-2.5">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Revenue</p>
            <p className="text-sm font-bold font-mono text-emerald-700">₹{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="h-6 w-px bg-border" />
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Pending</p>
            <p className="text-sm font-bold font-mono text-rose-600">₹{totalPending.toLocaleString()}</p>
          </div>
          <div className="h-6 w-px bg-border" />
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Sales Count</p>
            <p className="text-sm font-bold">{filtered.length}</p>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-card/20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-bold">No sales recorded yet</h3>
          {cropId && (
            <Button onClick={() => setAddOpen(true)} className="mt-4 gap-2 bg-[#1C4E35] text-white hover:bg-[#163d29]">
              Record First Sale
            </Button>
          )}
        </div>
      )}

      <div className="space-y-8">
        {visibleGroups.map(g => (
          <div key={g.key} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{g.label}</h3>
              <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                ₹{g.total.toLocaleString()}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {g.items.map(s => (
                <SaleCard 
                  key={s._id} sale={s} 
                  onEdit={setEditingSale} 
                  onDelete={() => {/* Note: Implement deletion logic using useMutation inside this list component or pass it down */}} 
                  onUpdatePayment={setUpdatingPayment} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => setPage(p => p + 1)}>
            Load More Sales
          </Button>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Sale</DialogTitle></DialogHeader>
          {cropId && <AddSaleForm cropId={cropId} onSuccess={() => setAddOpen(false)} />}
        </DialogContent>
      </Dialog>
      
      {editingSale && (
        <EditSaleDialog sale={editingSale} open={!!editingSale} onOpenChange={v => !v && setEditingSale(null)} />
      )}

      {updatingPayment && (
        <PaymentUpdateDialog sale={updatingPayment} open={!!updatingPayment} onOpenChange={v => !v && setUpdatingPayment(null)} />
      )}
    </div>
  );
}
