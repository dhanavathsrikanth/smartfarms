import { Phone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BuyerCard({ buyer, onEdit, onDelete }: { buyer: any, onEdit?: (b: any) => void, onDelete?: (b: any) => void }) {
  const renderStars = () => {
    const rating = buyer.rating || 0;
    return (
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(i => (
          <Star key={i} className={`w-3 h-3 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
        ))}
      </div>
    );
  };

  const reliability = buyer.reliabilityScore || 0;
  
  return (
    <div className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">{buyer.name}</h3>
            {buyer.buyerType && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                {buyer.buyerType}
              </span>
            )}
          </div>
          {buyer.contact && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Phone className="w-3 h-3" /> {buyer.contact}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {renderStars()}
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="w-6 h-6 rounded-full text-muted-foreground hover:bg-muted" onClick={() => onEdit?.(buyer)}>&bull;&bull;&bull;</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 bg-muted/30 p-2 rounded-lg">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Volume</p>
          <p className="font-mono font-bold text-sm text-emerald-700">₹{((buyer.totalAmountPaid || 0) + (buyer.totalAmountPending || 0)).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Orders</p>
          <p className="font-bold text-sm text-center">{buyer.totalTransactions || 0}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Pending</p>
          <p className="font-mono font-bold text-sm text-rose-600">₹{(buyer.totalAmountPending || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-1 relative group cursor-help">
        <div className="flex justify-between text-xs font-medium">
          <span>Reliability</span>
          <span className={reliability > 80 ? "text-emerald-600" : reliability > 50 ? "text-amber-600" : "text-rose-600"}>
            {reliability.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-500" style={{ width: `${reliability}%` }} />
          <div className="h-full bg-rose-500" style={{ width: `${100 - reliability}%` }} />
        </div>
      </div>
    </div>
  );
}
