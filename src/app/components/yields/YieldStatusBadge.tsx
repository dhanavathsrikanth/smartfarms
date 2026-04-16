import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  hasYield: boolean;
  status: string; // crop status: "active" | "harvested" | "failed" | "archived"
}

export function YieldStatusBadge({ hasYield, status }: Props) {
  if (hasYield) {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
        <CheckCircle className="h-3 w-3" />
        Yield Recorded
      </Badge>
    );
  }

  if (status === "harvested") {
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
        <AlertCircle className="h-3 w-3" />
        Yield Not Recorded
      </Badge>
    );
  }

  return (
    <Badge className="gap-1 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
      <Clock className="h-3 w-3" />
      In Progress
    </Badge>
  );
}
