"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { CheckCircle } from "lucide-react";
import { PaymentUpdateDialog } from "./PaymentUpdateDialog";
import { useState } from "react";
import { format } from "date-fns";

export function PendingPaymentsWidget() {
  const sales = useQuery(api.sales.listAllSales, { paymentStatus: "pending" });
  const [selectedSale, setSelectedSale] = useState<any>(null);

  if (sales === undefined) return <div className="h-40 bg-muted/20 animate-pulse rounded-xl" />;

  const pendingAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  if (sales.length === 0) {
    return (
      <div className="bg-emerald-50 text-emerald-800 p-6 rounded-xl border border-emerald-200 text-center">
        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
        <h3 className="font-bold">All payments collected!</h3>
      </div>
    );
  }

  return (
    <div className="bg-rose-50 rounded-xl border border-rose-200 overflow-hidden">
      <div className="p-4 bg-rose-100 border-b border-rose-200">
        <h3 className="font-bold text-rose-800">₹{pendingAmount.toLocaleString()} waiting to be collected</h3>
        <p className="text-xs text-rose-600 font-medium">Across {sales.length} pending sales</p>
      </div>
      <div className="divide-y divide-rose-100 max-h-60 overflow-y-auto">
        {sales.map(sale => (
          <div key={sale._id} className="p-3 flex items-center justify-between hover:bg-rose-50/50 transition-colors">
            <div>
              <p className="font-semibold text-rose-900 text-sm">{sale.buyerName}</p>
              <p className="text-xs text-rose-600">{sale.cropName} &bull; {format(new Date(sale.date), "MMM d")}</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="font-bold text-rose-700 font-mono text-sm mb-1">₹{sale.totalAmount.toLocaleString()}</p>
              <button 
                onClick={() => setSelectedSale(sale)}
                className="text-xs font-semibold bg-white text-emerald-700 px-2 py-0.5 rounded shadow-sm border hover:bg-emerald-50 transition-colors"
              >
                Mark Paid
              </button>
            </div>
          </div>
        ))}
      </div>
      {selectedSale && (
        <PaymentUpdateDialog sale={selectedSale} open={!!selectedSale} onOpenChange={(val) => !val && setSelectedSale(null)} />
      )}
    </div>
  );
}
