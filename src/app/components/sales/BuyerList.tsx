"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { User, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuyerCard } from "./BuyerCard";
import { Skeleton } from "@/components/ui/skeleton";

export function BuyerList() {
  const buyers = useQuery(api.sales.listBuyers);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("revenue");

  const filtered = useMemo(() => {
    if (!buyers) return [];
    let res = [...buyers];

    if (search) {
      const q = search.toLowerCase();
      res = res.filter(b => b.name.toLowerCase().includes(q) || (b.contact && b.contact.toLowerCase().includes(q)));
    }

    res.sort((a, b) => {
      const aRev = (a.totalAmountPaid || 0) + (a.totalAmountPending || 0);
      const bRev = (b.totalAmountPaid || 0) + (b.totalAmountPending || 0);
      if (sort === "revenue") return bRev - aRev;
      if (sort === "transactions") return (b.totalTransactions || 0) - (a.totalTransactions || 0);
      if (sort === "reliability") return (b.reliabilityScore || 0) - (a.reliabilityScore || 0);
      return 0;
    });

    return res;
  }, [buyers, search, sort]);

  if (buyers === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-full md:w-96" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search buyers by name or contact..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sort} onValueChange={(val) => val && setSort(val)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Total Revenue</SelectItem>
            <SelectItem value="transactions">Transactions Count</SelectItem>
            <SelectItem value="reliability">Reliability Score</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 border-2 border-dashed rounded-xl">
          <User className="h-10 w-10 mx-auto text-muted-foreground opacity-50 mb-4" />
          <p className="text-muted-foreground font-medium max-w-sm mx-auto">No buyers found. Buyers are added automatically when you record a sale to a new buyer.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(b => (
            <BuyerCard key={b._id} buyer={b} />
          ))}
        </div>
      )}
    </div>
  );
}
