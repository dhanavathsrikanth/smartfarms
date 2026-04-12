import { useState } from "react";
import { format } from "date-fns";
import { User, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaleTypeBadge } from "./SaleTypeBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { PaymentReminder } from "./PaymentReminder";

interface SaleCardProps {
  sale: any;
  onEdit: (sale: any) => void;
  onDelete: (saleId: string) => void;
  onUpdatePayment: (sale: any) => void;
  onClick?: (sale: any) => void;
}

export function SaleCard({ sale, onEdit, onDelete, onUpdatePayment, onClick }: SaleCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const borderColors: Record<string, string> = {
    paid: "border-l-4 border-l-emerald-500",
    partial: "border-l-4 border-l-amber-500",
    pending: "border-l-4 border-l-rose-500",
  };
  const borderClass = borderColors[sale.paymentStatus] || "border-l-4 border-l-gray-300";

  return (
    <div 
      className={`bg-card text-card-foreground p-4 rounded-xl border shadow-sm flex flex-col gap-3 transition-shadow hover:shadow-md ${borderClass} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={(e) => {
        // Prevent click if clicking on buttons
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
        onClick?.(sale);
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-2">
          <SaleTypeBadge saleType={sale.saleType} />
          <PaymentStatusBadge status={sale.paymentStatus} />
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap ml-2">
          {format(new Date(sale.date), "MMM d, yyyy")}
        </div>
      </div>

      <div>
        <div className="text-2xl font-mono font-bold text-emerald-700 dark:text-emerald-400">
          {formatCurrency(sale.totalAmount)}
        </div>
        <div className="text-sm text-muted-foreground">
          {sale.weight} {sale.weightUnit} @ {formatCurrency(sale.ratePerUnit)}/{sale.weightUnit}
        </div>
        <div className="flex items-center gap-1 mt-1 font-medium">
          <User className="w-4 h-4 text-muted-foreground" />
          {sale.buyerName}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {sale.cropName} &bull; {sale.farmName}
        </div>
      </div>

      {sale.notes && (
        <div className="text-sm italic text-muted-foreground border-l-2 border-muted pl-2">
          {sale.notes}
        </div>
      )}

      {sale.photoUrl && (
        <a href={sale.photoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <Receipt className="w-4 h-4" /> View Receipt
        </a>
      )}

      <div className="flex flex-col gap-2 pt-2 border-t mt-1">
        <div className="flex gap-2">
          {sale.paymentStatus === "pending" && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onUpdatePayment(sale)}>
              Mark as Paid
            </Button>
          )}
          {sale.paymentStatus === "partial" && (
            <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => onUpdatePayment(sale)}>
              Update Payment
            </Button>
          )}
          {sale.paymentStatus !== "paid" && (
            <PaymentReminder 
              buyerName={sale.buyerName} 
              amount={sale.totalAmount} 
              saleDetails={{
                cropName: sale.cropName,
                weightKg: sale.weightUnit === "kg" ? sale.weight : sale.weightUnit === "quintal" ? sale.weight * 100 : sale.weight * 1000,
                date: format(new Date(sale.date), "MMM d, yyyy")
              }}
            />
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => onEdit(sale)}>Edit</Button>
          {isDeleting ? (
            <Button size="sm" variant="destructive" onClick={() => onDelete(sale._id)}>Confirm</Button>
          ) : (
            <Button size="sm" variant="ghost" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => setIsDeleting(true)}>Delete</Button>
          )}
        </div>
      </div>
    </div>
  );
}
