import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PaymentStatusBadge({ status, className }: { status: string, className?: string }) {
  const mapping: Record<string, { color: string; icon: any; label: string; animate?: boolean }> = {
    paid: { color: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200", icon: CheckCircle, label: "Paid" },
    pending: { color: "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200", icon: Clock, label: "Pending", animate: true },
    partial: { color: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200", icon: AlertCircle, label: "Partial" },
  };

  const config = mapping[status.toLowerCase()] || { color: "bg-gray-100 text-gray-800", icon: Clock, label: status };
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} flex items-center gap-1 font-medium ${className || ""}`}>
      {config.animate ? (
        <span className="relative flex h-2 w-2 mr-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
      ) : (
        <Icon className="w-3 h-3" />
      )}
      {config.label}
    </Badge>
  );
}
