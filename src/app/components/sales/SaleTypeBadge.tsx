import { Store, User, FileSignature, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SaleTypeBadge({ saleType, className }: { saleType: string, className?: string }) {
  const mapping: Record<string, { bg: string; icon: any; label: string }> = {
    mandi: { bg: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200", icon: Store, label: "Mandi" },
    direct: { bg: "bg-green-100 text-green-800 hover:bg-green-200 border-green-200", icon: User, label: "Direct" },
    contract: { bg: "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200", icon: FileSignature, label: "Contract" },
    other: { bg: "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200", icon: MoreHorizontal, label: "Other" },
  };

  const config = mapping[saleType.toLowerCase()] || mapping.other;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.bg} font-medium flex items-center gap-1 ${className || ""}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
